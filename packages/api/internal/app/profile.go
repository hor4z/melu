package app

import (
	"context"
	"encoding/json"
	"sort"
	"time"

	"melu/internal/domain"
)

// melu's learning profile.
//
// An honest warning, written here so it does not get lost: "learning styles" as a fixed label
// (you are visual, you are kinesthetic) have no support in the evidence. Teaching someone
// "in their style" does not improve what they learn. What does work, and what melu does:
//
//  1. a short declared preference, useful to get started and to make the person think about themselves;
//  2. an observed performance per kind of content, measured against the person's own average;
//  3. the blend of the two, where the observed side weighs more as evidence accumulates.
//
// That is why the profile is always shown as "today", with how much evidence backs it, and it moves on its own.

// Axis is a dimension whose poles compete with each other: within an axis the values add up to 1.
type Axis struct {
	Key   string
	Poles []string
}

var Axes = []Axis{
	{"channel", []string{"see", "listen", "read", "do"}},
	{"spark", []string{"challenge", "story", "game", "real"}},
	{"pace", []string{"step", "map"}},
	{"company", []string{"alone", "with_others"}},
	{"scaffold", []string{"support", "discover"}},
	{"dose", []string{"bite", "session"}},
}

const (
	neutral      = 0.5 // performing at one's own average
	minMass      = 1.0 // minimum accumulated load for a pole to move the profile
	massToAssert = 2.0 // and to tell the teacher "this one works better for them"
)

var axisOfPole = func() map[string]string {
	m := map[string]string{}
	for _, e := range Axes {
		for _, p := range e.Poles {
			m[p] = e.Key
		}
	}
	return m
}()

// ---- the declared side: the onboarding answers ----

// Each onboarding answer splits points across poles. The catalog lives in the front (it is copy),
// but the split lives here so the number is the same no matter who looks at it.
var answerWeights = map[string]map[string]float64{
	// channel: the same idea told four ways, twice
	"channel1:see": {"see": 1}, "channel1:listen": {"listen": 1}, "channel1:read": {"read": 1}, "channel1:do": {"do": 1},
	"channel2:see": {"see": 1}, "channel2:listen": {"listen": 1}, "channel2:read": {"read": 1}, "channel2:do": {"do": 1},
	// spark: four ways to open the same activity
	"spark:challenge": {"challenge": 1}, "spark:story": {"story": 1}, "spark:game": {"game": 1}, "spark:real": {"real": 1},
	// pace
	"pace:step": {"step": 1}, "pace:map": {"map": 1},
	// company: what you do when you get stuck
	"company:think":  {"alone": 1},
	"company:search": {"alone": 0.7, "support": 0.3},
	"company:ask":    {"with_others": 1},
	"company:tell":   {"with_others": 0.7, "listen": 0.3},
	// scaffold
	"scaffold:example": {"support": 1}, "scaffold:try": {"discover": 1},
	// dose
	"dose:bite": {"bite": 1}, "dose:session": {"session": 1},
	// the band splits no points: it decides which content is shown and with how many words
	"band:small": {}, "band:medium": {}, "band:large": {},
}

// smoothing keeps a single tap from being worth 100 % and the rest 0 %. An answer is an answer,
// not a certainty: with one vote a two-pole axis lands at 79/21, not 100/0.
const smoothing = 0.35

// declaredFrom turns the raw answers into 0..1 values normalized per axis.
// An axis with no answers is split evenly: we know nothing yet.
func declaredFrom(answers map[string]string) map[string]float64 {
	raw := map[string]float64{}
	for question, option := range answers {
		for pole, w := range answerWeights[question+":"+option] {
			raw[pole] += w
		}
	}
	for _, e := range Axes {
		var add float64
		for _, p := range e.Poles {
			add += raw[p]
		}
		if add > 0 {
			for _, p := range e.Poles {
				raw[p] += smoothing
			}
		}
	}
	return normalizeByAxis(raw)
}

func normalizeByAxis(raw map[string]float64) map[string]float64 {
	out := map[string]float64{}
	for _, e := range Axes {
		var add float64
		for _, p := range e.Poles {
			add += raw[p]
		}
		for _, p := range e.Poles {
			if add <= 0 {
				out[p] = round2(1 / float64(len(e.Poles)))
			} else {
				out[p] = round2(raw[p] / add)
			}
		}
	}
	return out
}

// ---- the observed side: which kind of content works better for them ----

// polesOfActivity reads the six axes of the composition and the blocks of the document, and returns
// how much of each pole that mission "loads". It is a declared mapping, not a model: it can be argued
// about by looking at this table.
func polesOfActivity(comp, doc json.RawMessage) map[string]float64 {
	w := map[string]float64{}
	add := func(m map[string]float64, k float64) {
		for pole, v := range m {
			w[pole] += v * k
		}
	}

	var c struct {
		Experience  string   `json:"experience"`
		Setting     string   `json:"setting"`
		Social      string   `json:"social"`
		Evidence    string   `json:"evidence"`
		Lens        string   `json:"lens"`
		Disciplines []string `json:"disciplines"`
	}
	_ = json.Unmarshal(comp, &c)

	add(map[string]map[string]float64{
		"practice":     {"step": 1, "bite": 0.5},
		"challenge":    {"challenge": 2, "discover": 0.5},
		"research":     {"discover": 1.5, "map": 1, "session": 1},
		"build":        {"do": 2, "real": 1, "session": 1},
		"game":         {"game": 2, "do": 0.5, "bite": 0.5},
		"real_mission": {"real": 2, "do": 1},
		"creation":     {"do": 1.5, "story": 1, "discover": 0.5},
		"debate":       {"with_others": 2, "listen": 1, "story": 0.5},
		"experiment":   {"discover": 1.5, "do": 1.5},
		"simulation":   {"see": 1, "game": 1, "do": 0.5},
		"checkin":      {"bite": 1},
	}[c.Experience], 1)

	add(map[string]map[string]float64{
		"screen":     {"see": 1},
		"paper":      {"read": 1.5},
		"kit":        {"do": 2},
		"printer_3d": {"do": 2, "real": 1},
		"street":     {"do": 1.5, "real": 1.5},
		"home":       {"real": 1},
		"kitchen":    {"do": 1.5, "real": 1.5},
		"robot":      {"do": 2, "game": 0.5},
	}[c.Setting], 1)

	add(map[string]map[string]float64{
		"alone": {"alone": 2}, "pair": {"with_others": 1.5}, "team": {"with_others": 2},
		"whole_group": {"with_others": 2}, "across_groups": {"with_others": 2}, "family": {"with_others": 1.5, "real": 0.5},
	}[c.Social], 1)

	add(map[string]map[string]float64{
		"answer": {"read": 0.5}, "photo": {"see": 1.5, "real": 0.5}, "audio": {"listen": 2},
		"file": {"do": 1.5}, "observation": {"with_others": 0.5}, "peer_review": {"with_others": 1.5},
		"self_report": {},
	}[c.Evidence], 1)

	// the blocks: what the person actually did, screen by screen
	var d struct {
		Phases []struct {
			Blocks []struct {
				Type        string `json:"type"`
				Hint        string `json:"hint"`
				Explanation string `json:"explanation"`
			} `json:"blocks"`
		} `json:"phases"`
	}
	_ = json.Unmarshal(doc, &d)
	var nBlocks, nScaffolds int
	for _, f := range d.Phases {
		for _, b := range f.Blocks {
			nBlocks++
			if b.Hint != "" || b.Explanation != "" {
				nScaffolds++
			}
			add(map[string]map[string]float64{
				"manipulative": {"do": 1.5, "see": 0.5},
				"game":         {"game": 1.5, "do": 0.5},
				"order":        {"do": 0.8},
				"match":        {"do": 0.8, "see": 0.4},
				"callout":      {"see": 0.4},
				"paragraph":    {"read": 0.4},
				"list":         {"read": 0.3, "step": 0.4},
				"fill_in":      {"read": 0.6},
				"question":     {"read": 0.5},
				"number":       {"read": 0.3},
				"choice":       {"read": 0.3},
				"multi":        {"read": 0.3},
				"check":        {"read": 0.3},
				"evidence":     {"real": 0.6},
			}[b.Type], 1)
		}
	}
	if nBlocks > 0 {
		if r := float64(nScaffolds) / float64(nBlocks); r > 0.3 {
			w["support"] += 1.5
		} else if r < 0.1 {
			w["discover"] += 0.8
		}
	}
	switch {
	case nBlocks > 0 && nBlocks <= 6:
		w["bite"] += 1.5
	case nBlocks >= 12:
		w["session"] += 1.5
	}
	if len(d.Phases) >= 3 {
		w["session"] += 0.8
	}
	return w
}

// Performance per pole: how well that kind of content works for this person.
type Performance struct {
	Pole     string  `json:"pole"`
	Accuracy float64 `json:"accuracy"` // 0..1 across the missions that load that pole
	Delta    float64 `json:"delta"`    // against the person's own average
	Missions float64 `json:"missions"` // accumulated evidence (fractional: one mission splits)
}

// LiveProfile is what the person and the teacher see: the blend, with how much backs it.
type LiveProfile struct {
	PersonID  string             `json:"personId"`
	Name      string             `json:"name,omitempty"`
	Has       bool               `json:"has"` // went through the onboarding
	Declared  map[string]float64 `json:"declared"`
	Observed  map[string]float64 `json:"observed"`
	Profile   map[string]float64 `json:"profile"`
	Band      string             `json:"band"`     // small | medium | large: roughly where they are
	Weight    float64            `json:"weight"`   // how much the observed side weighs, 0..1
	Missions  int                `json:"missions"` // submissions with data
	Strong    []Performance      `json:"strong"`   // what works best for them, against their own average
	Weak      []Performance      `json:"weak"`     //
	UpdatedAt *time.Time         `json:"updatedAt,omitempty"`
}

// live blends the declared with the observed. Evidence takes over gradually, never all at once.
func live(personID string, decl *domain.Profile, facts []Fact) *LiveProfile {
	out := &LiveProfile{PersonID: personID, Declared: map[string]float64{}, Observed: map[string]float64{}, Profile: map[string]float64{}, Strong: []Performance{}, Weak: []Performance{}}
	if decl != nil {
		out.Has = true
		out.Declared = decl.Declared
		var rs map[string]string
		if json.Unmarshal(decl.Answers, &rs) == nil {
			out.Band = rs["band"]
		}
		a := decl.UpdatedAt
		out.UpdatedAt = &a
	}
	if len(out.Declared) == 0 {
		out.Declared = normalizeByAxis(nil)
	}

	// own average: the yardstick everything else is compared against
	var sumAc, nAc float64
	type acc struct{ w, wac float64 }
	poles := map[string]*acc{}
	for _, h := range facts {
		if h.Status == "in_progress" {
			continue
		}
		ac := accuracy(h.Document, h.Answers, h.Steps)
		if ac < 0 {
			continue
		}
		sumAc += ac
		nAc++
		out.Missions++
		for pole, w := range polesOfActivity(h.Composition, h.Document) {
			if w <= 0 || axisOfPole[pole] == "" {
				continue
			}
			a := poles[pole]
			if a == nil {
				a = &acc{}
				poles[pole] = a
			}
			a.w += w
			a.wac += w * ac
		}
	}

	if nAc == 0 {
		out.Observed = normalizeByAxis(nil)
		out.Profile = out.Declared
		return out
	}
	own := sumAc / nAc

	// Within each axis, the pole that works best gets more weight. A pole with no data is NOT
	// worth zero: it is worth neutral. Not having measured something is not having measured it badly.
	raw := map[string]float64{}
	for _, e := range Axes {
		hasData := false
		for _, p := range e.Poles {
			if a := poles[p]; a != nil && a.w >= minMass {
				hasData = true
			}
		}
		if !hasData {
			continue // whole axis with no evidence: normalizeByAxis leaves it even
		}
		for _, p := range e.Poles {
			a := poles[p]
			if a == nil || a.w < minMass {
				raw[p] = neutral
				continue
			}
			perf := a.wac / a.w
			raw[p] = neutral + (perf - own)
			if raw[p] < 0.05 {
				raw[p] = 0.05
			}
			if a.w >= massToAssert {
				out.Strong = append(out.Strong, Performance{Pole: p, Accuracy: round2(perf), Delta: round2(perf - own), Missions: round1(a.w)})
			}
		}
	}
	out.Observed = normalizeByAxis(raw)

	// evidence weighs in slowly: it takes real work to move the profile
	out.Weight = round2(min1(float64(out.Missions) / 12))
	for pole, d := range out.Declared {
		out.Profile[pole] = round2((1-out.Weight)*d + out.Weight*out.Observed[pole])
	}

	sort.Slice(out.Strong, func(i, j int) bool { return out.Strong[i].Delta > out.Strong[j].Delta })
	all := out.Strong
	for i := len(all) - 1; i >= 0 && len(out.Weak) < 3; i-- {
		if all[i].Delta < -0.03 {
			out.Weak = append(out.Weak, all[i])
		}
	}
	var fuertes []Performance
	for _, r := range all {
		if r.Delta > 0.03 && len(fuertes) < 3 {
			fuertes = append(fuertes, r)
		}
	}
	out.Strong = fuertes
	if out.Strong == nil {
		out.Strong = []Performance{}
	}
	return out
}

// ---- use cases ----

// SaveProfile records what the person answered in the onboarding. It is declared, not observed:
// the event is marked as such.
func (s *Services) SaveProfile(ctx context.Context, p domain.Person, answers map[string]string) (*LiveProfile, error) {
	clean := map[string]string{}
	for k, v := range answers {
		if _, ok := answerWeights[k+":"+v]; ok {
			clean[k] = v
		}
	}
	raw, _ := json.Marshal(clean)
	if err := s.Profiles.Save(ctx, domain.Profile{PersonID: p.ID, Declared: declaredFrom(clean), Answers: raw}); err != nil {
		return nil, err
	}
	_ = s.Events.Emit(ctx, domain.Event{PersonID: &p.ID, Verb: "profile.declared", Payload: clean, Source: "declared", OccurredAt: time.Now()})
	return s.MyProfile(ctx, p)
}

func (s *Services) MyProfile(ctx context.Context, p domain.Person) (*LiveProfile, error) {
	decl, err := s.Profiles.ByPerson(ctx, p.ID)
	if err != nil && err != domain.ErrNotFound {
		return nil, err
	}
	facts, err := s.Dashboard.FactsOfLearner(ctx, p.ID)
	if err != nil {
		return nil, err
	}
	v := live(p.ID, decl, facts)
	v.Name = p.Name
	return v, nil
}

// GroupProfiles: what the teacher sees. Only for the groups where they are a guide.
func (s *Services) GroupProfiles(ctx context.Context, p domain.Person, groupID string) ([]LiveProfile, error) {
	g, _, aprendices, err := s.GroupDetail(ctx, p, groupID)
	if err != nil {
		return nil, err
	}
	_ = g
	decls, err := s.Profiles.OfGroup(ctx, groupID)
	if err != nil {
		return nil, err
	}
	out := []LiveProfile{}
	for _, a := range aprendices {
		facts, err := s.Dashboard.FactsOfLearner(ctx, a.ID)
		if err != nil {
			return nil, err
		}
		var decl *domain.Profile
		if d, ok := decls[a.ID]; ok {
			decl = &d
		}
		v := live(a.ID, decl, facts)
		v.Name = a.Name
		out = append(out, *v)
	}
	return out, nil
}

func round2(f float64) float64 { return float64(int(f*100+0.5)) / 100 }
func min1(f float64) float64 {
	if f > 1 {
		return 1
	}
	return f
}

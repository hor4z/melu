package app

import (
	"context"
	"encoding/json"
	"sort"
	"time"

	"melu/internal/domain"
)

// ---- Teacher dashboard: metrics derived from events and submissions ----

type Tile struct {
	Value  float64   `json:"value"`
	Series []float64 `json:"series"`
}

type Signal struct {
	LearnerID   string `json:"learnerId"`
	Learner     string `json:"learner"`
	GroupID     string `json:"groupId"`
	Group       string `json:"group"`
	Kind        string `json:"kind"` // dropout | misses | slow | shines
	Detail      string `json:"detail"`
	Suggestion  string `json:"suggestion"`
	RecipeTitle string `json:"recipeTitle,omitempty"`
	RecipeID    string `json:"recipeId,omitempty"`
	// La misión concreta de la que habla la señal. El abandono es el único caso sin receta que
	// asignar, así que sin esto se queda sin nada que hacer: con el id, la acción es ir a ver
	// qué alcanzó a hacer antes de trabarse.
	AssignmentID string `json:"assignmentId,omitempty"`
}

type ByKind struct {
	Experience  string  `json:"experience"`
	Submissions int     `json:"submissions"`
	AvgMinutes  float64 `json:"avgMinutes"`
	Accuracy    float64 `json:"accuracy"` // 0..1, -1 when there is nothing to check
}

type Dashboard struct {
	Spaces   int `json:"spaces"`
	Groups   int `json:"groups"`
	Learners int `json:"learners"`
	ToReview int `json:"toReview"`
	// Los otros dos estados de una entrega. Son cuentas de cosas que pasaron, así que se leen
	// solas: no hacen falta promedios ni comparaciones para saber qué significan.
	Unfinished int `json:"unfinished"`
	Graded     int `json:"graded"`
	// Cuántas misiones hay puestas, contando una por chico. Con las tres de arriba alcanza para
	// saber cuántas faltan sin que el front tenga que restar a ciegas.
	Assigned  int             `json:"assigned"`
	Signals   []Signal        `json:"signals"`
	ByKind    []ByKind        `json:"byKind"`
	Checklist map[string]bool `json:"checklist"`
	// Las que esperan una devolución, de las más nuevas a las más viejas. No son "las últimas
	// que llegaron": corregir una le toca el `updated_at`, así que en una tanda de correcciones
	// las recién corregidas empujaban a las pendientes fuera de la ventana y el panel se quedaba
	// sin nada que mostrar justo cuando más había para hacer.
	AwaitingReview []SubmissionSummary `json:"awaitingReview"`
}

type SubmissionSummary struct {
	SubmissionID string    `json:"submissionId"`
	AssignmentID string    `json:"assignmentId"`
	Learner      string    `json:"learner"`
	Title        string    `json:"title"`
	Group        string    `json:"group"`
	Status       string    `json:"status"`
	Minutes      float64   `json:"minutes"`
	Accuracy     float64   `json:"accuracy"`
	When         time.Time `json:"when"`
}

type Fact = domain.Fact

// Submissions es todo lo que entregaron, sin recortar y con las que están a medias. El panel
// muestra las últimas ocho; esto es la lista entera, que es a donde lleva "ver todas".
func (s *Services) AllSubmissions(ctx context.Context, p domain.Person, spaceID string) ([]SubmissionSummary, error) {
	facts, err := s.Dashboard.FactsOfGuide(ctx, p.ID, spaceID)
	if err != nil {
		return nil, err
	}
	out := make([]SubmissionSummary, 0, len(facts))
	for _, h := range facts {
		min, _ := minutes(h)
		when := h.UpdatedAt
		if h.SubmittedAt != nil {
			when = *h.SubmittedAt
		}
		out = append(out, SubmissionSummary{
			SubmissionID: h.SubmissionID, AssignmentID: h.AssignmentID, Learner: h.Learner, Title: h.Title,
			Group: h.Group, Status: h.Status, Minutes: min, Accuracy: accuracy(h.Document, h.Answers, h.Steps), When: when,
		})
	}
	return out, nil
}

func (s *Services) PanelDocente(ctx context.Context, p domain.Person, spaceID string) (*Dashboard, error) {
	spaces, err := s.Spaces.OfPerson(ctx, p.ID)
	if err != nil {
		return nil, err
	}
	groups, err := s.Groups.OfGuide(ctx, p.ID, spaceID)
	if err != nil {
		return nil, err
	}
	facts, err := s.Dashboard.FactsOfGuide(ctx, p.ID, spaceID)
	if err != nil {
		return nil, err
	}
	if spaceID != "" {
		spaces = filterSpaces(spaces, spaceID)
	}
	out := &Dashboard{Spaces: len(spaces), Groups: len(groups), Signals: []Signal{}, ByKind: []ByKind{}, AwaitingReview: []SubmissionSummary{}}
	out.Assigned, _ = s.Dashboard.Assigned(ctx, p.ID, spaceID)
	for _, g := range groups {
		out.Learners += g.Learners
	}

	z := s.zone()
	today := startOfDay(time.Now(), z)

	var sumMin, nMin float64
	weekStart := today.AddDate(0, 0, -6)
	kinds := map[string]*ByKind{}
	byLearner := map[string][]Fact{}
	for _, h := range facts {
		switch h.Status {
		case "submitted":
			out.ToReview++
		case "in_progress":
			out.Unfinished++
		case "graded":
			out.Graded++
		}
		min, ok := minutes(h)
		ac := accuracy(h.Document, h.Answers, h.Steps)
		// De qué semana es una entrega lo decide cuándo volvió, que es el momento que le importa
		// al docente.
		when := h.UpdatedAt
		if h.SubmittedAt != nil {
			when = *h.SubmittedAt
		}
		if ok && !startOfDay(when, z).Before(weekStart) {
			sumMin += min
			nMin++
		}
		t := kinds[h.Experience]
		if t == nil {
			t = &ByKind{Experience: h.Experience, Accuracy: -1}
			kinds[h.Experience] = t
		}
		if h.Status != "in_progress" {
			t.Submissions++
			if ok {
				t.AvgMinutes += min
			}
			if ac >= 0 {
				if t.Accuracy < 0 {
					t.Accuracy = 0
				}
				t.Accuracy += ac
			}
		}
		byLearner[h.LearnerID] = append(byLearner[h.LearnerID], h)
		if h.Status == "submitted" && len(out.AwaitingReview) < 8 {
			cu := h.UpdatedAt
			if h.SubmittedAt != nil {
				cu = *h.SubmittedAt
			}
			out.AwaitingReview = append(out.AwaitingReview, SubmissionSummary{SubmissionID: h.SubmissionID, AssignmentID: h.AssignmentID, Learner: h.Learner, Title: h.Title, Group: h.Group, Status: h.Status, Minutes: min, Accuracy: ac, When: cu})
		}
	}
	// El promedio del grupo no se publica: nadie lo muestra. Se calcula porque es la referencia
	// contra la que las señales deciden quién tarda más y quién vuela.
	avgMinutes := 0.0
	if nMin > 0 {
		avgMinutes = round1(sumMin / nMin)
	}
	for _, t := range kinds {
		if t.Submissions > 0 {
			t.AvgMinutes = round1(t.AvgMinutes / float64(t.Submissions))
			if t.Accuracy >= 0 {
				t.Accuracy = round1(t.Accuracy / float64(t.Submissions))
			}
		}
		out.ByKind = append(out.ByKind, *t)
	}
	sort.Slice(out.ByKind, func(i, j int) bool { return out.ByKind[i].Submissions > out.ByKind[j].Submissions })

	recipes, _ := s.Activities.Recipes(ctx)
	if sen := s.signals(byLearner, avgMinutes, recipes); sen != nil {
		out.Signals = sen
	}

	acts, _ := s.Activities.OfSpaces(ctx, idsOf(spaces))
	out.Checklist = map[string]bool{
		"group":    len(groups) > 0,
		"invite":   out.Learners > 0,
		"activity": len(acts) > 0,
		"assign":   len(facts) > 0 || s.Dashboard.HasAssignments(ctx, p.ID),
		"grade":    hasGraded(facts),
	}
	return out, nil
}

// signals applies simple, honest rules. No inferring emotions: only what actually happened.
func (s *Services) signals(byLearner map[string][]Fact, median float64, recipes []domain.Activity) []Signal {
	recipe := func(title string) (string, string) {
		for _, r := range recipes {
			if r.Title == title {
				return r.ID, r.Title
			}
		}
		return "", ""
	}
	var out []Signal
	for _, hs := range byLearner {
		var misses, submitted int
		var slow int
		var untouched *Fact
		var fastAndRight int
		for i := range hs {
			h := hs[i]
			if h.Status == "in_progress" && h.OpenedAt != nil && time.Since(*h.OpenedAt) > 48*time.Hour {
				untouched = &h
			}
			if h.Status == "in_progress" {
				continue
			}
			submitted++
			ac := accuracy(h.Document, h.Answers, h.Steps)
			min, ok := minutes(h)
			if ac >= 0 && ac < 0.5 {
				misses++
			}
			if ok && median > 0 && min > 2*median {
				slow++
			}
			if ok && median > 0 && min < median*0.6 && ac >= 0.9 {
				fastAndRight++
			}
		}
		h := hs[0]
		base := Signal{LearnerID: h.LearnerID, Learner: h.Learner, GroupID: h.GroupID, Group: h.Group}
		switch {
		case misses >= 2:
			id, t := recipe("Fracciones en la cocina")
			out = append(out, Signal{LearnerID: base.LearnerID, Learner: base.Learner, GroupID: base.GroupID, Group: base.Group, Kind: "misses", Detail: "Falló la mitad o más de los chequeos en 2 misiones", Suggestion: "Volver a lo concreto antes del símbolo: una actividad con lente CPA, corta, en casa.", RecipeID: id, RecipeTitle: t})
		case untouched != nil:
			out = append(out, Signal{LearnerID: base.LearnerID, Learner: base.Learner, GroupID: base.GroupID, Group: base.Group, Kind: "dropout", Detail: `Abrió "` + untouched.Title + `" hace más de 2 días y no la entregó`, Suggestion: "Preguntale en qué fase se trabó. Si es la primera, la consigna puede no estar clara.", AssignmentID: untouched.AssignmentID})
		case slow >= 2:
			id, t := recipe("Gallinas y conejos")
			out = append(out, Signal{LearnerID: base.LearnerID, Learner: base.Learner, GroupID: base.GroupID, Group: base.Group, Kind: "slow", Detail: "Tarda más del doble que el grupo en 2 misiones", Suggestion: "Partir la actividad en fases más cortas o trabajarla en pareja.", RecipeID: id, RecipeTitle: t})
		case fastAndRight >= 2 && submitted >= 2:
			id, t := recipe("Gallinas y conejos")
			out = append(out, Signal{LearnerID: base.LearnerID, Learner: base.Learner, GroupID: base.GroupID, Group: base.Group, Kind: "shines", Detail: "Resuelve rápido y bien", Suggestion: "Un reto con más pasos, o que explique su método en audio para otros.", RecipeID: id, RecipeTitle: t})
		}
	}
	// Por urgencia y no por nombre. Quien se traba o abandonó necesita atención hoy; quien vuela
	// también merece algo, pero puede esperar al final de la lista.
	urgency := map[string]int{"misses": 0, "dropout": 1, "slow": 2, "shines": 3}
	sort.Slice(out, func(i, j int) bool {
		if urgency[out[i].Kind] != urgency[out[j].Kind] {
			return urgency[out[i].Kind] < urgency[out[j].Kind]
		}
		return out[i].Learner < out[j].Learner
	})
	return out
}

// ---- Learner progress ----

type Progress struct {
	Done       int                 `json:"done"`
	InProgress int                 `json:"inProgress"`
	Minutes    float64             `json:"minutes"`
	Accuracy   float64             `json:"accuracy"`
	Streak     int                 `json:"streak"`
	Missions   []SubmissionSummary `json:"missions"`
	Experience map[string]int      `json:"experiences"`
}

func (s *Services) MiProgreso(ctx context.Context, p domain.Person) (*Progress, error) {
	facts, err := s.Dashboard.FactsOfLearner(ctx, p.ID)
	if err != nil {
		return nil, err
	}
	z := s.zone()
	out := &Progress{Missions: []SubmissionSummary{}, Experience: map[string]int{}}
	var sumAc, nAc float64
	days := map[string]bool{}
	for _, h := range facts {
		min, _ := minutes(h)
		ac := accuracy(h.Document, h.Answers, h.Steps)
		if h.Status == "in_progress" {
			out.InProgress++
		} else {
			out.Done++
			out.Minutes += min
			out.Experience[h.Experience]++
			if ac >= 0 {
				sumAc += ac
				nAc++
			}
			if h.SubmittedAt != nil {
				days[h.SubmittedAt.In(z).Format("2006-01-02")] = true
			}
		}
		cu := h.UpdatedAt
		if h.SubmittedAt != nil {
			cu = *h.SubmittedAt
		}
		out.Missions = append(out.Missions, SubmissionSummary{SubmissionID: h.SubmissionID, AssignmentID: h.AssignmentID, Title: h.Title, Group: h.Group, Status: h.Status, Minutes: min, Accuracy: ac, When: cu})
	}
	out.Minutes = round1(out.Minutes)
	if nAc > 0 {
		out.Accuracy = round1(sumAc / nAc)
	} else {
		out.Accuracy = -1
	}
	for d := time.Now().In(z); days[d.Format("2006-01-02")]; d = d.AddDate(0, 0, -1) {
		out.Streak++
	}
	return out, nil
}

// ---- helpers ----

func minutes(h Fact) (float64, bool) {
	if h.OpenedAt == nil || h.SubmittedAt == nil {
		return 0, false
	}
	m := h.SubmittedAt.Sub(*h.OpenedAt).Minutes()
	if m < 0 {
		return 0, false
	}
	return round1(m), true
}

// accuracy uses what the runner already graded step by step; with no steps (old data) it
// compares answers to choice blocks against their correct option. -1 when there is nothing to measure.
func accuracy(doc, resp, steps json.RawMessage) float64 {
	var ps map[string]struct {
		OK *bool `json:"ok"`
	}
	if len(steps) > 0 && json.Unmarshal(steps, &ps) == nil && len(ps) > 0 {
		var total, ok float64
		for _, v := range ps {
			if v.OK == nil {
				continue
			}
			total++
			if *v.OK {
				ok++
			}
		}
		if total > 0 {
			return ok / total
		}
	}
	return accuracyFromChecks(doc, resp)
}

func accuracyFromChecks(doc, resp json.RawMessage) float64 {
	var d struct {
		Phases []struct {
			Blocks []struct {
				ID      string `json:"id"`
				Type    string `json:"type"`
				Correct *int   `json:"correct"`
			} `json:"blocks"`
		} `json:"phases"`
	}
	var r map[string]any
	if json.Unmarshal(doc, &d) != nil || json.Unmarshal(resp, &r) != nil {
		return -1
	}
	var total, ok float64
	for _, f := range d.Phases {
		for _, b := range f.Blocks {
			if (b.Type != "check" && b.Type != "choice") || b.Correct == nil {
				continue
			}
			total++
			if v, has := r[b.ID]; has {
				if n, isNum := v.(float64); isNum && int(n) == *b.Correct {
					ok++
				}
			}
		}
	}
	if total == 0 {
		return -1
	}
	return ok / total
}

func round1(f float64) float64 { return float64(int(f*10+0.5)) / 10 }

func idsOf(es []domain.Space) []string {
	out := make([]string, 0, len(es))
	for _, e := range es {
		out = append(out, e.ID)
	}
	return out
}

func hasGraded(hs []Fact) bool {
	for _, h := range hs {
		if h.Status == "graded" {
			return true
		}
	}
	return false
}

func filterSpaces(es []domain.Space, id string) []domain.Space {
	for _, e := range es {
		if e.ID == id {
			return []domain.Space{e}
		}
	}
	return es
}

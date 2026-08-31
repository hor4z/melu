package app

import (
	"context"
	"encoding/json"
	"sort"
	"time"

	"melu/internal/domain"
)

// ---- Panel del docente: métricas derivadas de eventos y entregas ----

type Tile struct {
	Valor float64   `json:"valor"`
	Serie []float64 `json:"serie"`
}

type Senal struct {
	AprendizID   string `json:"aprendizId"`
	Aprendiz     string `json:"aprendiz"`
	GrupoID      string `json:"grupoId"`
	Grupo        string `json:"grupo"`
	Tipo         string `json:"tipo"` // abandono | errores | lento | brilla
	Detalle      string `json:"detalle"`
	Sugerencia   string `json:"sugerencia"`
	RecetaTitulo string `json:"recetaTitulo,omitempty"`
	RecetaID     string `json:"recetaId,omitempty"`
}

type PorTipo struct {
	Experiencia string  `json:"experiencia"`
	Entregas    int     `json:"entregas"`
	MinutosProm float64 `json:"minutosProm"`
	Aciertos    float64 `json:"aciertos"` // 0..1, -1 si no hay chequeos
}

type Panel struct {
	Espacios       int              `json:"espacios"`
	Grupos         int              `json:"grupos"`
	Aprendices     int              `json:"aprendices"`
	ParaMirar      int              `json:"paraMirar"`
	MinutosProm    float64          `json:"minutosProm"`
	Aciertos       float64          `json:"aciertos"`
	SerieSemana    []DiaSerie       `json:"serieSemana"`
	Senales        []Senal          `json:"senales"`
	PorTipo        []PorTipo        `json:"porTipo"`
	Checklist      map[string]bool  `json:"checklist"`
	EntregasRecien []EntregaResumen `json:"entregasRecientes"`
}

type DiaSerie struct {
	Dia        string `json:"dia"`
	Abiertas   int    `json:"abiertas"`
	Entregadas int    `json:"entregadas"`
}

type EntregaResumen struct {
	EntregaID    string    `json:"entregaId"`
	AsignacionID string    `json:"asignacionId"`
	Aprendiz     string    `json:"aprendiz"`
	Titulo       string    `json:"titulo"`
	Grupo        string    `json:"grupo"`
	Estado       string    `json:"estado"`
	Minutos      float64   `json:"minutos"`
	Aciertos     float64   `json:"aciertos"`
	Cuando       time.Time `json:"cuando"`
}

type Hecho = domain.Hecho

func (s *Servicios) PanelDocente(ctx context.Context, p domain.Persona, espacioID string) (*Panel, error) {
	esp, err := s.Espacios.DePersona(ctx, p.ID)
	if err != nil {
		return nil, err
	}
	grupos, err := s.Grupos.DeGuia(ctx, p.ID, espacioID)
	if err != nil {
		return nil, err
	}
	hechos, err := s.Panel.HechosDeGuia(ctx, p.ID, espacioID)
	if err != nil {
		return nil, err
	}
	if espacioID != "" {
		esp = filtrarEspacios(esp, espacioID)
	}
	out := &Panel{Espacios: len(esp), Grupos: len(grupos), Senales: []Senal{}, PorTipo: []PorTipo{}, EntregasRecien: []EntregaResumen{}, SerieSemana: []DiaSerie{}}
	for _, g := range grupos {
		out.Aprendices += g.Aprendices
	}

	// serie de la semana. Truncate(24h) trunca en UTC, así que en Argentina el «día» empezaba
	// a las 21:00 y estas barras salían corridas.
	z := s.zona()
	hoy := inicioDelDia(time.Now(), z)
	dias := map[string]*DiaSerie{}
	for i := 6; i >= 0; i-- {
		d := hoy.AddDate(0, 0, -i)
		k := d.Format("2006-01-02")
		dias[k] = &DiaSerie{Dia: k}
		out.SerieSemana = append(out.SerieSemana, DiaSerie{Dia: k})
	}

	var sumMin, nMin, sumAc, nAc float64
	tipos := map[string]*PorTipo{}
	porAprendiz := map[string][]Hecho{}
	for _, h := range hechos {
		if h.Estado == "entregada" {
			out.ParaMirar++
		}
		min, ok := minutos(h)
		ac := aciertos(h.Documento, h.Respuestas, h.Pasos)
		if ok {
			sumMin += min
			nMin++
		}
		if ac >= 0 {
			sumAc += ac
			nAc++
		}
		if h.Abierta != nil {
			if d, okd := dias[h.Abierta.In(z).Format("2006-01-02")]; okd {
				d.Abiertas++
			}
		}
		if h.Entregada != nil {
			if d, okd := dias[h.Entregada.In(z).Format("2006-01-02")]; okd {
				d.Entregadas++
			}
		}
		t := tipos[h.Experiencia]
		if t == nil {
			t = &PorTipo{Experiencia: h.Experiencia, Aciertos: -1}
			tipos[h.Experiencia] = t
		}
		if h.Estado != "en_curso" {
			t.Entregas++
			if ok {
				t.MinutosProm += min
			}
			if ac >= 0 {
				if t.Aciertos < 0 {
					t.Aciertos = 0
				}
				t.Aciertos += ac
			}
		}
		porAprendiz[h.AprendizID] = append(porAprendiz[h.AprendizID], h)
		if h.Estado != "en_curso" && len(out.EntregasRecien) < 8 {
			cu := h.Actualizada
			if h.Entregada != nil {
				cu = *h.Entregada
			}
			out.EntregasRecien = append(out.EntregasRecien, EntregaResumen{EntregaID: h.EntregaID, AsignacionID: h.AsignacionID, Aprendiz: h.Aprendiz, Titulo: h.Titulo, Grupo: h.Grupo, Estado: h.Estado, Minutos: min, Aciertos: ac, Cuando: cu})
		}
	}
	for i := range out.SerieSemana {
		out.SerieSemana[i] = *dias[out.SerieSemana[i].Dia]
	}
	if nMin > 0 {
		out.MinutosProm = round1(sumMin / nMin)
	}
	if nAc > 0 {
		out.Aciertos = round1(sumAc / nAc)
	} else {
		out.Aciertos = -1
	}
	for _, t := range tipos {
		if t.Entregas > 0 {
			t.MinutosProm = round1(t.MinutosProm / float64(t.Entregas))
			if t.Aciertos >= 0 {
				t.Aciertos = round1(t.Aciertos / float64(t.Entregas))
			}
		}
		out.PorTipo = append(out.PorTipo, *t)
	}
	sort.Slice(out.PorTipo, func(i, j int) bool { return out.PorTipo[i].Entregas > out.PorTipo[j].Entregas })

	recetas, _ := s.Actividades.Recetas(ctx)
	if sen := s.senales(porAprendiz, out.MinutosProm, recetas); sen != nil {
		out.Senales = sen
	}

	acts, _ := s.Actividades.DeEspacios(ctx, idsDe(esp))
	out.Checklist = map[string]bool{
		"grupo":     len(grupos) > 0,
		"invitar":   out.Aprendices > 0,
		"actividad": len(acts) > 0,
		"asignar":   len(hechos) > 0 || s.Panel.HayAsignaciones(ctx, p.ID),
		"corregir":  tieneCorregidas(hechos),
	}
	return out, nil
}

// senales aplica reglas simples y honestas. Nada de inferir emociones: solo lo que pasó.
func (s *Servicios) senales(porAprendiz map[string][]Hecho, mediana float64, recetas []domain.Actividad) []Senal {
	receta := func(titulo string) (string, string) {
		for _, r := range recetas {
			if r.Titulo == titulo {
				return r.ID, r.Titulo
			}
		}
		return "", ""
	}
	var out []Senal
	for _, hs := range porAprendiz {
		var fallos, entregadas int
		var lentas int
		var sinTocar *Hecho
		var rapidasBien int
		for i := range hs {
			h := hs[i]
			if h.Estado == "en_curso" && h.Abierta != nil && time.Since(*h.Abierta) > 48*time.Hour {
				sinTocar = &h
			}
			if h.Estado == "en_curso" {
				continue
			}
			entregadas++
			ac := aciertos(h.Documento, h.Respuestas, h.Pasos)
			min, ok := minutos(h)
			if ac >= 0 && ac < 0.5 {
				fallos++
			}
			if ok && mediana > 0 && min > 2*mediana {
				lentas++
			}
			if ok && mediana > 0 && min < mediana*0.6 && ac >= 0.9 {
				rapidasBien++
			}
		}
		h := hs[0]
		base := Senal{AprendizID: h.AprendizID, Aprendiz: h.Aprendiz, GrupoID: h.GrupoID, Grupo: h.Grupo}
		switch {
		case fallos >= 2:
			id, t := receta("Fracciones en la cocina")
			out = append(out, Senal{AprendizID: base.AprendizID, Aprendiz: base.Aprendiz, GrupoID: base.GrupoID, Grupo: base.Grupo, Tipo: "errores", Detalle: "Falló la mitad o más de los chequeos en 2 misiones", Sugerencia: "Volver a lo concreto antes del símbolo: una actividad con lente CPA, corta, en casa.", RecetaID: id, RecetaTitulo: t})
		case sinTocar != nil:
			out = append(out, Senal{AprendizID: base.AprendizID, Aprendiz: base.Aprendiz, GrupoID: base.GrupoID, Grupo: base.Grupo, Tipo: "abandono", Detalle: "Abrió «" + sinTocar.Titulo + "» hace más de 2 días y no la entregó", Sugerencia: "Preguntale en qué fase se trabó. Si es la primera, la consigna puede no estar clara."})
		case lentas >= 2:
			id, t := receta("Reto de la semana")
			out = append(out, Senal{AprendizID: base.AprendizID, Aprendiz: base.Aprendiz, GrupoID: base.GrupoID, Grupo: base.Grupo, Tipo: "lento", Detalle: "Tarda más del doble que el grupo en 2 misiones", Sugerencia: "Partir la actividad en fases más cortas o trabajarla en pareja.", RecetaID: id, RecetaTitulo: t})
		case rapidasBien >= 2 && entregadas >= 2:
			id, t := receta("Reto de la semana")
			out = append(out, Senal{AprendizID: base.AprendizID, Aprendiz: base.Aprendiz, GrupoID: base.GrupoID, Grupo: base.Grupo, Tipo: "brilla", Detalle: "Resuelve rápido y bien", Sugerencia: "Un reto con más pasos, o que explique su método en audio para otros.", RecetaID: id, RecetaTitulo: t})
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Aprendiz < out[j].Aprendiz })
	return out
}

// ---- Progreso del aprendiz ----

type Progreso struct {
	Hechas      int              `json:"hechas"`
	EnCurso     int              `json:"enCurso"`
	Minutos     float64          `json:"minutos"`
	Aciertos    float64          `json:"aciertos"`
	Racha       int              `json:"racha"`
	Misiones    []EntregaResumen `json:"misiones"`
	Experiencia map[string]int   `json:"experiencias"`
}

func (s *Servicios) MiProgreso(ctx context.Context, p domain.Persona) (*Progreso, error) {
	hechos, err := s.Panel.HechosDeAprendiz(ctx, p.ID)
	if err != nil {
		return nil, err
	}
	z := s.zona()
	out := &Progreso{Misiones: []EntregaResumen{}, Experiencia: map[string]int{}}
	var sumAc, nAc float64
	dias := map[string]bool{}
	for _, h := range hechos {
		min, _ := minutos(h)
		ac := aciertos(h.Documento, h.Respuestas, h.Pasos)
		if h.Estado == "en_curso" {
			out.EnCurso++
		} else {
			out.Hechas++
			out.Minutos += min
			out.Experiencia[h.Experiencia]++
			if ac >= 0 {
				sumAc += ac
				nAc++
			}
			if h.Entregada != nil {
				dias[h.Entregada.In(z).Format("2006-01-02")] = true
			}
		}
		cu := h.Actualizada
		if h.Entregada != nil {
			cu = *h.Entregada
		}
		out.Misiones = append(out.Misiones, EntregaResumen{EntregaID: h.EntregaID, AsignacionID: h.AsignacionID, Titulo: h.Titulo, Grupo: h.Grupo, Estado: h.Estado, Minutos: min, Aciertos: ac, Cuando: cu})
	}
	out.Minutos = round1(out.Minutos)
	if nAc > 0 {
		out.Aciertos = round1(sumAc / nAc)
	} else {
		out.Aciertos = -1
	}
	for d := time.Now().In(z); dias[d.Format("2006-01-02")]; d = d.AddDate(0, 0, -1) {
		out.Racha++
	}
	return out, nil
}

// ---- helpers ----

func minutos(h Hecho) (float64, bool) {
	if h.Abierta == nil || h.Entregada == nil {
		return 0, false
	}
	m := h.Entregada.Sub(*h.Abierta).Minutes()
	if m < 0 {
		return 0, false
	}
	return round1(m), true
}

// aciertos usa lo que el runner ya evaluó paso a paso; si no hay pasos (datos viejos),
// compara las respuestas a bloques de opciones con su opción correcta. -1 si no hay nada que medir.
func aciertos(doc, resp, pasos json.RawMessage) float64 {
	var ps map[string]struct {
		OK *bool `json:"ok"`
	}
	if len(pasos) > 0 && json.Unmarshal(pasos, &ps) == nil && len(ps) > 0 {
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
	return aciertosDeChequeos(doc, resp)
}

func aciertosDeChequeos(doc, resp json.RawMessage) float64 {
	var d struct {
		Fases []struct {
			Bloques []struct {
				ID       string `json:"id"`
				Tipo     string `json:"tipo"`
				Correcta *int   `json:"correcta"`
			} `json:"bloques"`
		} `json:"fases"`
	}
	var r map[string]any
	if json.Unmarshal(doc, &d) != nil || json.Unmarshal(resp, &r) != nil {
		return -1
	}
	var total, ok float64
	for _, f := range d.Fases {
		for _, b := range f.Bloques {
			if (b.Tipo != "chequeo" && b.Tipo != "opciones") || b.Correcta == nil {
				continue
			}
			total++
			if v, has := r[b.ID]; has {
				if n, isNum := v.(float64); isNum && int(n) == *b.Correcta {
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

func idsDe(es []domain.Espacio) []string {
	out := make([]string, 0, len(es))
	for _, e := range es {
		out = append(out, e.ID)
	}
	return out
}

func tieneCorregidas(hs []Hecho) bool {
	for _, h := range hs {
		if h.Estado == "corregida" {
			return true
		}
	}
	return false
}

func filtrarEspacios(es []domain.Espacio, id string) []domain.Espacio {
	for _, e := range es {
		if e.ID == id {
			return []domain.Espacio{e}
		}
	}
	return es
}

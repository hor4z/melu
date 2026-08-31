package app

import (
	"context"
	"sort"
	"time"

	"melu/internal/domain"
)

// Programar actividades: ponerles fecha de aparición, fecha de entrega, y repetirlas.
//
// Nada de esto es un calendario. La grilla horaria de un calendario existe para mostrar
// colisiones y huecos, y las cosas de la escuela no colisionan: la clase es cuando es la clase
// y una tarea no ocupa un horario. Lo que lleva información acá es qué día, en qué orden, y si
// está hecho. Así que hay una capacidad (programar) y dos lecturas distintas: la del docente,
// que planifica en semanas, y la del aprendiz, que ejecuta ahora.

const (
	// diasDeAnticipo: cuánto del futuro se le muestra al aprendiz en «lo que viene».
	diasDeAnticipo = 14
	// topeDeOcurrencias corta una serie absurda («hasta 2099») antes de que escriba miles de filas.
	topeDeOcurrencias = 200
	// diasDeRango: el tope del rango que puede pedir la programación del docente.
	diasDeRango = 92
)

// inicioDelDia da el arranque del día local. Reemplaza al Truncate(24h) que había en panel.go,
// que truncaba en UTC y hacía que en Argentina el «día» empezara a las 21:00.
func inicioDelDia(t time.Time, z *time.Location) time.Time {
	t = t.In(z)
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, z)
}

func (s *Servicios) zona() *time.Location {
	if s.Zona != nil {
		return s.Zona
	}
	return time.Local
}

// expandir convierte una regla en instantes concretos. Es el único lugar del servidor que
// necesita saber la zona: «los martes a las 10» no se vuelve un instante sin ella.
func expandir(r domain.Repeticion, z *time.Location) ([]time.Time, error) {
	if !r.Repite() {
		return nil, nil
	}
	hh, mm, err := partirHora(r.Hora)
	if err != nil {
		return nil, err
	}
	desde, err := time.ParseInLocation("2006-01-02", r.Desde, z)
	if err != nil {
		return nil, domain.ErrInvalido
	}
	hasta, err := time.ParseInLocation("2006-01-02", r.Hasta, z)
	if err != nil {
		return nil, domain.ErrInvalido
	}
	if hasta.Before(desde) {
		return nil, domain.ErrInvalido
	}
	quiere := map[time.Weekday]bool{}
	for _, d := range r.Dias {
		if d < 0 || d > 6 {
			return nil, domain.ErrInvalido
		}
		quiere[time.Weekday(d)] = true
	}
	var out []time.Time
	for d := desde; !d.After(hasta); d = d.AddDate(0, 0, 1) {
		if !quiere[d.Weekday()] {
			continue
		}
		out = append(out, time.Date(d.Year(), d.Month(), d.Day(), hh, mm, 0, 0, z))
		if len(out) > topeDeOcurrencias {
			return nil, domain.ErrInvalido
		}
	}
	if len(out) == 0 {
		return nil, domain.ErrInvalido
	}
	return out, nil
}

func partirHora(h string) (int, int, error) {
	var hh, mm int
	if len(h) != 5 || h[2] != ':' {
		return 0, 0, domain.ErrInvalido
	}
	for i, pos := range []int{0, 3} {
		v := int(h[pos]-'0')*10 + int(h[pos+1]-'0')
		if h[pos] < '0' || h[pos] > '9' || h[pos+1] < '0' || h[pos+1] > '9' {
			return 0, 0, domain.ErrInvalido
		}
		if i == 0 {
			hh = v
		} else {
			mm = v
		}
	}
	if hh > 23 || mm > 59 {
		return 0, 0, domain.ErrInvalido
	}
	return hh, mm, nil
}

// ---- la programación del docente ----

type Programacion struct {
	Desde  time.Time                     `json:"desde"`
	Hasta  time.Time                     `json:"hasta"`
	Items  []domain.Programado           `json:"items"`
	Series map[string]*domain.Repeticion `json:"series"` // para describirlas una sola vez
}

func (s *Servicios) VerProgramacion(ctx context.Context, p domain.Persona, espacioID string, desde, hasta time.Time) (*Programacion, error) {
	if hasta.Before(desde) || hasta.Sub(desde) > diasDeRango*24*time.Hour {
		return nil, domain.ErrInvalido
	}
	items, err := s.Programacion.DeGuia(ctx, p.ID, espacioID, desde, hasta)
	if err != nil {
		return nil, err
	}
	if items == nil {
		items = []domain.Programado{}
	}
	out := &Programacion{Desde: desde, Hasta: hasta, Items: items, Series: map[string]*domain.Repeticion{}}
	for _, it := range items {
		if it.SerieID == nil || out.Series[*it.SerieID] != nil {
			continue
		}
		if r, err := s.Series.PorID(ctx, *it.SerieID); err == nil {
			out.Series[*it.SerieID] = r
		}
	}
	return out, nil
}

func (s *Servicios) Reprogramar(ctx context.Context, p domain.Persona, asignacionID string, abre time.Time, cierra *time.Time) (*domain.Asignacion, error) {
	if cierra != nil && cierra.Before(abre) {
		return nil, domain.ErrInvalido
	}
	a, err := s.Asignaciones.PorID(ctx, asignacionID)
	if err != nil {
		return nil, err
	}
	g, err := s.Grupos.PorID(ctx, a.GrupoID)
	if err != nil {
		return nil, err
	}
	if !s.esMiembro(ctx, p.ID, g.EspacioID, domain.RolGuia, domain.RolCoordinador) {
		return nil, domain.ErrNoAutorizado
	}
	antes, antesCierra := a.Abre, a.Cierra
	if err := s.Asignaciones.Reprogramar(ctx, asignacionID, abre, cierra); err != nil {
		return nil, err
	}
	_ = s.Eventos.Emitir(ctx, domain.Evento{PersonaID: &p.ID, GrupoID: &a.GrupoID, ActividadID: &a.ActividadID,
		Verbo: "mision.reprogramada", Origen: "observado", Ocurrio: time.Now(),
		Payload: map[string]any{"asignacionId": asignacionID, "abreAntes": antes, "cierraAntes": antesCierra, "abre": abre, "cierra": cierra}})
	a.Abre, a.Cierra = abre, cierra
	return a, nil
}

type Corte struct {
	Borradas    int `json:"borradas"`
	Conservadas int `json:"conservadas"`
}

// CortarSerie deja de repetir de una fecha en adelante. No toca el pasado -eso es registro de lo
// que se planificó- ni las ocurrencias que ya tienen entregas, porque eso es trabajo de chicos.
func (s *Servicios) CortarSerie(ctx context.Context, p domain.Persona, serieID string, desde time.Time) (*Corte, error) {
	esp, err := s.Programacion.EspaciosDeSerie(ctx, serieID)
	if err != nil {
		return nil, err
	}
	if len(esp) == 0 {
		return nil, domain.ErrNoEncontrado
	}
	for _, e := range esp {
		if !s.esMiembro(ctx, p.ID, e, domain.RolGuia, domain.RolCoordinador) {
			return nil, domain.ErrNoAutorizado
		}
	}
	borradas, conservadas, err := s.Programacion.BorrarFuturasDeSerie(ctx, serieID, desde)
	if err != nil {
		return nil, err
	}
	_ = s.Series.Acortar(ctx, serieID, desde)
	_ = s.Eventos.Emitir(ctx, domain.Evento{PersonaID: &p.ID, Verbo: "serie.cortada", Origen: "observado", Ocurrio: time.Now(),
		Payload: map[string]any{"serieId": serieID, "desde": desde, "borradas": borradas, "conservadas": conservadas}})
	return &Corte{Borradas: borradas, Conservadas: conservadas}, nil
}

// ---- urgencia: un solo orden para todas las pantallas ----

// urgencia es más chico cuanto más apremia. Se define acá y no en el front para que «lo primero»
// sea lo mismo en «Hoy», en la tarjeta destacada y en cualquier lista futura.
func urgencia(a domain.Asignacion, ahora time.Time, z *time.Location) int {
	hecha := a.MiEstado != nil && (*a.MiEstado == "entregada" || *a.MiEstado == "corregida")
	switch {
	case hecha && *a.MiEstado == "corregida":
		return 70
	case hecha:
		return 60
	case a.Cierra != nil && a.Cierra.Before(ahora):
		return 0 // atrasada
	case a.Cierra != nil && inicioDelDia(*a.Cierra, z).Equal(inicioDelDia(ahora, z)):
		return 10 // vence hoy
	case a.Cierra != nil && a.Cierra.Sub(ahora) <= 3*24*time.Hour:
		return 20 // vence pronto
	case a.MiEstado != nil && *a.MiEstado == "en_curso":
		return 30
	case a.Cierra != nil:
		return 40
	default:
		return 50 // sin fecha
	}
}

func ordenarPorUrgencia(as []domain.Asignacion, ahora time.Time, z *time.Location) {
	sort.SliceStable(as, func(i, j int) bool {
		ui, uj := urgencia(as[i], ahora, z), urgencia(as[j], ahora, z)
		if ui != uj {
			return ui < uj
		}
		// a igual urgencia, primero la que vence antes; las sin fecha al final
		ci, cj := as[i].Cierra, as[j].Cierra
		if ci != nil && cj != nil && !ci.Equal(*cj) {
			return ci.Before(*cj)
		}
		if (ci == nil) != (cj == nil) {
			return ci != nil
		}
		return as[i].Abre.After(as[j].Abre)
	})
}

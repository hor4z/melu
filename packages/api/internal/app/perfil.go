package app

import (
	"context"
	"encoding/json"
	"sort"
	"time"

	"melu/internal/domain"
)

// El perfil de aprendizaje de melu.
//
// Advertencia honesta, escrita acá para que no se pierda: los "estilos de aprendizaje" como
// etiqueta fija (sos visual, sos kinestésico) no tienen respaldo en la evidencia. Enseñarle a
// alguien "en su estilo" no mejora lo que aprende. Lo que sí sirve, y es lo que hace melu:
//
//  1. una preferencia declarada, corta, que sirve para arrancar y para que la persona se piense;
//  2. un rendimiento observado por tipo de contenido, medido contra el propio promedio de la persona;
//  3. la mezcla de los dos, donde lo observado pesa más a medida que hay evidencia.
//
// Por eso el perfil se muestra siempre como "hoy", con cuánta evidencia lo sostiene, y cambia solo.

// Eje es una dimensión con polos que compiten entre sí: dentro de un eje los valores suman 1.
type Eje struct {
	Clave string
	Polos []string
}

var Ejes = []Eje{
	{"canal", []string{"ver", "escuchar", "leer", "hacer"}},
	{"chispa", []string{"reto", "historia", "juego", "real"}},
	{"ritmo", []string{"paso", "mapa"}},
	{"compania", []string{"solo", "conotros"}},
	{"andamio", []string{"apoyo", "descubrir"}},
	{"dosis", []string{"bocado", "sesion"}},
}

const (
	neutro          = 0.5 // rendir igual que el propio promedio
	masaMinima      = 1.0 // carga acumulada mínima de un polo para que mueva el perfil
	masaParaAfirmar = 2.0 // y para decirle al docente "le rinde más esto"
)

var ejeDePolo = func() map[string]string {
	m := map[string]string{}
	for _, e := range Ejes {
		for _, p := range e.Polos {
			m[p] = e.Clave
		}
	}
	return m
}()

// ---- lo declarado: las respuestas del onboarding ----

// Cada respuesta del onboarding reparte puntos entre polos. El catálogo vive en el front
// (es copy), pero el reparto vive acá para que el número sea el mismo mire quien mire.
var pesosDeRespuesta = map[string]map[string]float64{
	// canal: la misma idea contada de cuatro maneras, dos veces
	"canal1:ver": {"ver": 1}, "canal1:escuchar": {"escuchar": 1}, "canal1:leer": {"leer": 1}, "canal1:hacer": {"hacer": 1},
	"canal2:ver": {"ver": 1}, "canal2:escuchar": {"escuchar": 1}, "canal2:leer": {"leer": 1}, "canal2:hacer": {"hacer": 1},
	// chispa: cuatro maneras de abrir la misma actividad
	"chispa:reto": {"reto": 1}, "chispa:historia": {"historia": 1}, "chispa:juego": {"juego": 1}, "chispa:real": {"real": 1},
	// ritmo
	"ritmo:paso": {"paso": 1}, "ritmo:mapa": {"mapa": 1},
	// compañía: qué hacés cuando te trabás
	"compania:pensar":    {"solo": 1},
	"compania:buscar":    {"solo": 0.7, "apoyo": 0.3},
	"compania:preguntar": {"conotros": 1},
	"compania:contar":    {"conotros": 0.7, "escuchar": 0.3},
	// andamio
	"andamio:ejemplo": {"apoyo": 1}, "andamio:probar": {"descubrir": 1},
	// dosis
	"dosis:bocado": {"bocado": 1}, "dosis:sesion": {"sesion": 1},
	// la franja no reparte puntos: decide qué contenido se muestra y con cuántas palabras
	"banda:chico": {}, "banda:medio": {}, "banda:grande": {},
}

// suavizado evita que un solo toque valga 100 % y el resto 0 %. Una respuesta es una respuesta,
// no una certeza: con un voto un eje de dos polos queda 79/21, no 100/0.
const suavizado = 0.35

// declaradoDe convierte las respuestas crudas en valores 0..1 normalizados por eje.
// Un eje sin respuestas queda repartido en partes iguales: no sabemos nada todavía.
func declaradoDe(respuestas map[string]string) map[string]float64 {
	crudo := map[string]float64{}
	for pregunta, opcion := range respuestas {
		for polo, w := range pesosDeRespuesta[pregunta+":"+opcion] {
			crudo[polo] += w
		}
	}
	for _, e := range Ejes {
		var suma float64
		for _, p := range e.Polos {
			suma += crudo[p]
		}
		if suma > 0 {
			for _, p := range e.Polos {
				crudo[p] += suavizado
			}
		}
	}
	return normalizarPorEje(crudo)
}

func normalizarPorEje(crudo map[string]float64) map[string]float64 {
	out := map[string]float64{}
	for _, e := range Ejes {
		var suma float64
		for _, p := range e.Polos {
			suma += crudo[p]
		}
		for _, p := range e.Polos {
			if suma <= 0 {
				out[p] = round2(1 / float64(len(e.Polos)))
			} else {
				out[p] = round2(crudo[p] / suma)
			}
		}
	}
	return out
}

// ---- lo observado: qué tipo de contenido le rinde mejor ----

// polosDeActividad lee los seis ejes de la composición y los bloques del documento, y devuelve
// cuánto "carga" esa misión de cada polo. Es un mapeo declarado, no un modelo: se puede discutir
// mirando esta tabla.
func polosDeActividad(comp, doc json.RawMessage) map[string]float64 {
	w := map[string]float64{}
	suma := func(m map[string]float64, k float64) {
		for polo, v := range m {
			w[polo] += v * k
		}
	}

	var c struct {
		Experiencia string   `json:"experiencia"`
		Escenario   string   `json:"escenario"`
		Social      string   `json:"social"`
		Evidencia   string   `json:"evidencia"`
		Lente       string   `json:"lente"`
		Disciplinas []string `json:"disciplinas"`
	}
	_ = json.Unmarshal(comp, &c)

	suma(map[string]map[string]float64{
		"practica":      {"paso": 1, "bocado": 0.5},
		"reto":          {"reto": 2, "descubrir": 0.5},
		"investigacion": {"descubrir": 1.5, "mapa": 1, "sesion": 1},
		"construccion":  {"hacer": 2, "real": 1, "sesion": 1},
		"juego":         {"juego": 2, "hacer": 0.5, "bocado": 0.5},
		"mision_real":   {"real": 2, "hacer": 1},
		"creacion":      {"hacer": 1.5, "historia": 1, "descubrir": 0.5},
		"debate":        {"conotros": 2, "escuchar": 1, "historia": 0.5},
		"experimento":   {"descubrir": 1.5, "hacer": 1.5},
		"simulacion":    {"ver": 1, "juego": 1, "hacer": 0.5},
		"checkin":       {"bocado": 1},
	}[c.Experiencia], 1)

	suma(map[string]map[string]float64{
		"pantalla":     {"ver": 1},
		"papel":        {"leer": 1.5},
		"kit":          {"hacer": 2},
		"impresora_3d": {"hacer": 2, "real": 1},
		"calle":        {"hacer": 1.5, "real": 1.5},
		"casa":         {"real": 1},
		"cocina":       {"hacer": 1.5, "real": 1.5},
		"robot":        {"hacer": 2, "juego": 0.5},
	}[c.Escenario], 1)

	suma(map[string]map[string]float64{
		"solo": {"solo": 2}, "pareja": {"conotros": 1.5}, "equipo": {"conotros": 2},
		"grupo": {"conotros": 2}, "entre_grupos": {"conotros": 2}, "familia": {"conotros": 1.5, "real": 0.5},
	}[c.Social], 1)

	suma(map[string]map[string]float64{
		"respuesta": {"leer": 0.5}, "foto": {"ver": 1.5, "real": 0.5}, "audio": {"escuchar": 2},
		"archivo": {"hacer": 1.5}, "observacion": {"conotros": 0.5}, "coevaluacion": {"conotros": 1.5},
		"autoreporte": {},
	}[c.Evidencia], 1)

	// los bloques: lo que la persona realmente hizo, pantalla por pantalla
	var d struct {
		Fases []struct {
			Bloques []struct {
				Tipo        string `json:"tipo"`
				Pista       string `json:"pista"`
				Explicacion string `json:"explicacion"`
			} `json:"bloques"`
		} `json:"fases"`
	}
	_ = json.Unmarshal(doc, &d)
	var nBloques, nApoyos int
	for _, f := range d.Fases {
		for _, b := range f.Bloques {
			nBloques++
			if b.Pista != "" || b.Explicacion != "" {
				nApoyos++
			}
			suma(map[string]map[string]float64{
				"manipulable": {"hacer": 1.5, "ver": 0.5},
				"juego":       {"juego": 1.5, "hacer": 0.5},
				"ordenar":     {"hacer": 0.8},
				"emparejar":   {"hacer": 0.8, "ver": 0.4},
				"destacado":   {"ver": 0.4},
				"parrafo":     {"leer": 0.4},
				"lista":       {"leer": 0.3, "paso": 0.4},
				"completar":   {"leer": 0.6},
				"pregunta":    {"leer": 0.5},
				"numerico":    {"leer": 0.3},
				"opciones":    {"leer": 0.3},
				"varias":      {"leer": 0.3},
				"chequeo":     {"leer": 0.3},
				"evidencia":   {"real": 0.6},
			}[b.Tipo], 1)
		}
	}
	if nBloques > 0 {
		if r := float64(nApoyos) / float64(nBloques); r > 0.3 {
			w["apoyo"] += 1.5
		} else if r < 0.1 {
			w["descubrir"] += 0.8
		}
	}
	switch {
	case nBloques > 0 && nBloques <= 6:
		w["bocado"] += 1.5
	case nBloques >= 12:
		w["sesion"] += 1.5
	}
	if len(d.Fases) >= 3 {
		w["sesion"] += 0.8
	}
	return w
}

// Rendimiento por polo: cuánto le rinde ese tipo de contenido a esta persona.
type Rendimiento struct {
	Polo       string  `json:"polo"`
	Aciertos   float64 `json:"aciertos"`   // 0..1 en las misiones que cargan ese polo
	Diferencia float64 `json:"diferencia"` // contra el propio promedio de la persona
	Misiones   float64 `json:"misiones"`   // evidencia acumulada (fraccionaria: una misión reparte)
}

// PerfilVivo es lo que ve la persona y ve el docente: la mezcla, con cuánto la sostiene.
type PerfilVivo struct {
	PersonaID   string             `json:"personaId"`
	Nombre      string             `json:"nombre,omitempty"`
	Tiene       bool               `json:"tiene"` // hizo el onboarding
	Declarado   map[string]float64 `json:"declarado"`
	Observado   map[string]float64 `json:"observado"`
	Perfil      map[string]float64 `json:"perfil"`
	Banda       string             `json:"banda"`    // chico | medio | grande: por dónde anda
	Peso        float64            `json:"peso"`     // cuánto pesa lo observado, 0..1
	Misiones    int                `json:"misiones"` // entregas con datos
	Fuertes     []Rendimiento      `json:"fuertes"`  // lo que más le rinde, contra su propio promedio
	Flojos      []Rendimiento      `json:"flojos"`   //
	Actualizado *time.Time         `json:"actualizado,omitempty"`
}

// vivo mezcla lo declarado con lo observado. La evidencia manda de a poco, nunca de golpe.
func vivo(personaID string, decl *domain.Perfil, hechos []Hecho) *PerfilVivo {
	out := &PerfilVivo{PersonaID: personaID, Declarado: map[string]float64{}, Observado: map[string]float64{}, Perfil: map[string]float64{}, Fuertes: []Rendimiento{}, Flojos: []Rendimiento{}}
	if decl != nil {
		out.Tiene = true
		out.Declarado = decl.Declarado
		var rs map[string]string
		if json.Unmarshal(decl.Respuestas, &rs) == nil {
			out.Banda = rs["banda"]
		}
		a := decl.Actualizado
		out.Actualizado = &a
	}
	if len(out.Declarado) == 0 {
		out.Declarado = normalizarPorEje(nil)
	}

	// promedio propio: la vara con la que se compara todo lo demás
	var sumAc, nAc float64
	type acum struct{ w, wac float64 }
	polos := map[string]*acum{}
	for _, h := range hechos {
		if h.Estado == "en_curso" {
			continue
		}
		ac := aciertos(h.Documento, h.Respuestas, h.Pasos)
		if ac < 0 {
			continue
		}
		sumAc += ac
		nAc++
		out.Misiones++
		for polo, w := range polosDeActividad(h.Composicion, h.Documento) {
			if w <= 0 || ejeDePolo[polo] == "" {
				continue
			}
			a := polos[polo]
			if a == nil {
				a = &acum{}
				polos[polo] = a
			}
			a.w += w
			a.wac += w * ac
		}
	}

	if nAc == 0 {
		out.Observado = normalizarPorEje(nil)
		out.Perfil = out.Declarado
		return out
	}
	propio := sumAc / nAc

	// Dentro de cada eje, el polo que le rinde más se lleva más peso. Un polo del que no hay
	// datos NO vale cero: vale lo neutro. No haber medido algo no es haberlo medido mal.
	crudo := map[string]float64{}
	for _, e := range Ejes {
		conDatos := false
		for _, p := range e.Polos {
			if a := polos[p]; a != nil && a.w >= masaMinima {
				conDatos = true
			}
		}
		if !conDatos {
			continue // eje entero sin evidencia: normalizarPorEje lo deja parejo
		}
		for _, p := range e.Polos {
			a := polos[p]
			if a == nil || a.w < masaMinima {
				crudo[p] = neutro
				continue
			}
			rend := a.wac / a.w
			crudo[p] = neutro + (rend - propio)
			if crudo[p] < 0.05 {
				crudo[p] = 0.05
			}
			if a.w >= masaParaAfirmar {
				out.Fuertes = append(out.Fuertes, Rendimiento{Polo: p, Aciertos: round2(rend), Diferencia: round2(rend - propio), Misiones: round1(a.w)})
			}
		}
	}
	out.Observado = normalizarPorEje(crudo)

	// la evidencia pesa de a poco: hace falta trabajo real para mover el perfil
	out.Peso = round2(min1(float64(out.Misiones) / 12))
	for polo, d := range out.Declarado {
		out.Perfil[polo] = round2((1-out.Peso)*d + out.Peso*out.Observado[polo])
	}

	sort.Slice(out.Fuertes, func(i, j int) bool { return out.Fuertes[i].Diferencia > out.Fuertes[j].Diferencia })
	todos := out.Fuertes
	for i := len(todos) - 1; i >= 0 && len(out.Flojos) < 3; i-- {
		if todos[i].Diferencia < -0.03 {
			out.Flojos = append(out.Flojos, todos[i])
		}
	}
	var fuertes []Rendimiento
	for _, r := range todos {
		if r.Diferencia > 0.03 && len(fuertes) < 3 {
			fuertes = append(fuertes, r)
		}
	}
	out.Fuertes = fuertes
	if out.Fuertes == nil {
		out.Fuertes = []Rendimiento{}
	}
	return out
}

// ---- casos de uso ----

// GuardarPerfil registra lo que la persona contestó en el onboarding. Es declarado, no observado:
// queda marcado como tal en el evento.
func (s *Servicios) GuardarPerfil(ctx context.Context, p domain.Persona, respuestas map[string]string) (*PerfilVivo, error) {
	limpio := map[string]string{}
	for k, v := range respuestas {
		if _, ok := pesosDeRespuesta[k+":"+v]; ok {
			limpio[k] = v
		}
	}
	crudo, _ := json.Marshal(limpio)
	if err := s.Perfiles.Guardar(ctx, domain.Perfil{PersonaID: p.ID, Declarado: declaradoDe(limpio), Respuestas: crudo}); err != nil {
		return nil, err
	}
	_ = s.Eventos.Emitir(ctx, domain.Evento{PersonaID: &p.ID, Verbo: "perfil.declarado", Payload: limpio, Origen: "declarado", Ocurrio: time.Now()})
	return s.MiPerfil(ctx, p)
}

func (s *Servicios) MiPerfil(ctx context.Context, p domain.Persona) (*PerfilVivo, error) {
	decl, err := s.Perfiles.PorPersona(ctx, p.ID)
	if err != nil && err != domain.ErrNoEncontrado {
		return nil, err
	}
	hechos, err := s.Panel.HechosDeAprendiz(ctx, p.ID)
	if err != nil {
		return nil, err
	}
	v := vivo(p.ID, decl, hechos)
	v.Nombre = p.Nombre
	return v, nil
}

// PerfilesDeGrupo: lo que ve el docente. Solo de los grupos donde es guía.
func (s *Servicios) PerfilesDeGrupo(ctx context.Context, p domain.Persona, grupoID string) ([]PerfilVivo, error) {
	g, _, aprendices, err := s.GrupoConDetalle(ctx, p, grupoID)
	if err != nil {
		return nil, err
	}
	_ = g
	decls, err := s.Perfiles.DeGrupo(ctx, grupoID)
	if err != nil {
		return nil, err
	}
	out := []PerfilVivo{}
	for _, a := range aprendices {
		hechos, err := s.Panel.HechosDeAprendiz(ctx, a.ID)
		if err != nil {
			return nil, err
		}
		var decl *domain.Perfil
		if d, ok := decls[a.ID]; ok {
			decl = &d
		}
		v := vivo(a.ID, decl, hechos)
		v.Nombre = a.Nombre
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

import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import fondo from './assets/fondoambush.png'
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom'

export default function App() {
  const [user, setUser] = useState(null)
  const [partidos, setPartidos] = useState([])
  const [mostrarForm, setMostrarForm] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [editando, setEditando] = useState(null)
  const [partidoEnVivo, setPartidoEnVivo] = useState(null)
  const [vista, setVista] = useState('partidos')
  const [filtroEstado, setFiltroEstado] = useState('abierto')
  const [cancha, setCancha] = useState('')
  const [jugadores, setJugadores] = useState('')
  const [fechaHora, setFechaHora] = useState('')
  const [rol, setRol] = useState(null)

  const esAdmin = rol === 'admin'
  console.log("ROL ACTUAL:", rol)
  const esModerador = rol === 'moderador'

useEffect(() => {
  const getUser = async () => {
    const { data } = await supabase.auth.getUser()

    const user = data.user
    setUser(user)

    if (user) {
      const { data: rolData, error } = await supabase
        .from('roles_usuario')
        .select('rol')
        .eq('id', user.id)
        .single()

      if (error) {
        console.log("Error rol:", error)
      }

      setRol(rolData?.rol || 'jugador')
    }

    cargarPartidos()
  }

  getUser()

  const { data: listener } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      setUser(session?.user || null)
    }
  )

  return () => {
    listener.subscription.unsubscribe()
  }
}, [])

useEffect(() => {
  if (editando) {
    setCancha(editando.cancha)
    setJugadores(editando.jugadores.toString())

    const fechaLocal = new Date(editando.fecha_hora)
    const offset = fechaLocal.getTimezoneOffset()

    const fechaAjustada = new Date(fechaLocal.getTime() - offset * 60000)
      .toISOString()
      .slice(0, 16)

    setFechaHora(fechaAjustada)
  }
}, [editando])

  const cargarPartidos = async () => {
  const { data, error } = await supabase
    .from('partidos')
    .select('*')
    .order('fecha_hora', { ascending: true })

  if (error) {
    console.log("ERROR:", error)
    return
  }

  console.log("PARTIDOS:", data)

  setPartidos(data || [])
}

  const crearPartido = async () => {
    const fechaUTC = new Date(fechaHora).toISOString()

    if (editando) {
      const { error } = await supabase
        .from('partidos')
        .update({ fecha_hora: fechaUTC, cancha, jugadores })
        .eq('id', editando.id)

    if (error) {
      console.log(error)
      alert("Error al actualizar partido")
      return
    }

    alert("Partido actualizado ✏️")

    } else {
      // CREAR NUEVO PARTIDO
      const { error } = await supabase.from('partidos').insert({
        fecha_hora: fechaUTC,
        cancha,
        jugadores,
        estado: 'abierto'
      })

      if (error) {
        console.log(error)
        alert("Error al crear partido")
        return
      }

      alert("Partido creado ✔")
    }

     setEditando(null)
    setMostrarForm(false)
    setCancha('')
    setJugadores('')
    setFechaHora('')

    cargarPartidos()
    }

  const eliminarPartido = async (id) => {
    await supabase.from('partidos').delete().eq('id', id)
    cargarPartidos()
  }

  const unirse = async (partidoId, equipo,cupoMax) => {
    const { data: jugadores } = await supabase
      .from('partido_jugadores')
      .select('*')
      .eq('partido_id', partidoId)
      .eq('equipo', equipo)
    
    if (jugadores.length >= cupoMax) {
      alert('El equipo está lleno')
      return
    }
    await supabase.from('partido_jugadores').insert({
      partido_id: partidoId,
      usuario_id: user.id,
      equipo,
      nombre:
        user.user_metadata?.nombre ||
        user.user_metadata?.full_name ||
        user.email
    })
  }

  const salirEquipo = async (partidoId) => {
  const user = (await supabase.auth.getUser()).data.user

  await supabase
    .from('partido_jugadores')
    .delete()
    .eq('partido_id', partidoId)
    .eq('usuario_id', user.id)
}

if (!user) {
  return (
    <Pantalla>
      <h1 style={styles.brand}>Derbys Ambush FC</h1>

      <AuthEmail />

      <br />

      <button
        style={styles.primaryBtn}
        onClick={() =>
          supabase.auth.signInWithOAuth({ provider: 'google' })
        }
      >
        Entrar con Google
      </button>
    </Pantalla>
  )
}

  if (partidoEnVivo) {
    return (
      <PartidoEnVivo 
        partido={partidoEnVivo}
        volver={() => setPartidoEnVivo(null)}
        esAdmin={esAdmin}
        esModerador={esModerador}
      />
    )
  }

  return (
  <Pantalla>

    <div style={styles.header}>
      <h1 style={styles.brandSmall}>Derbys Ambush FC</h1>
<button
  style={styles.logoutBtn}
  onClick={async () => {
    await supabase.auth.signOut()
    setUser(null)
  }}
>
  Salir
</button>
    </div>

    <Routes>

  <Route path="/" element={<Navigate to="/inicio" />} />
  <Route path="/inicio" element={
    <div>
      <h2>Bienvenido a Derbys Ambush FC</h2>
      <p>⚽ Usa el Menú Para Navegar ⚽</p>
    </div>
    } />
  <Route path="/partidos" element={
  <>
   <div style={{
  display: 'flex',
  gap: 10,
  marginBottom: 20
}}>
  <button
    style={{
      ...styles.secondaryBtn,
      background: filtroEstado === 'abierto' ? '#00c853' : '#ffffff22'
    }}
    onClick={() => setFiltroEstado('abierto')}
  >
    🟢 Activos
  </button>

  <button
    style={{
      ...styles.secondaryBtn,
      background: filtroEstado === 'cerrado' ? '#ff4d4d' : '#ffffff22'
    }}
    onClick={() => setFiltroEstado('cerrado')}
  >
    🔒 Finalizados
  </button>
</div>

    {(esAdmin || esModerador) && (
      <>
        {!mostrarForm && (
          <button
            style={styles.primaryBtn}
            onClick={() => setMostrarForm(true)}
          >
            + Crear partido
          </button>
        )}

          <button
            style={{
            ...styles.secondaryBtn,
            marginLeft: 10,
            background: modoEdicion ? '#ff9800' : '#ffffff22'
        }}
            onClick={() => setModoEdicion(!modoEdicion)}
          >
            ✏️ Editar Partido
          </button>

        {mostrarForm && (
          <div style={styles.cardForm}>
            <select
              style={styles.input}
              value={cancha}
              onChange={(e) => setCancha(e.target.value)}
            >
              <option value="">Seleccionar Cancha</option>
              <option value="Americano">Americano</option>
              <option value="Colon">Colón</option>
            </select>

            <input
              type="datetime-local"
              style={styles.input}
              value={fechaHora}
              onChange={(e) => setFechaHora(e.target.value)}
            />
            <input
              placeholder="# jugadores"
              style={styles.input}
              value={jugadores}
              onChange={(e) => setJugadores(e.target.value)}
            />
            <button style={styles.primaryBtn} onClick={crearPartido}>
              {editando ? 'Actualizar Partido' : 'Guardar'}
            </button>

          <button
  style={{
    ...styles.secondaryBtn,
    marginTop: 8
  }}
  onClick={() => {
    setEditando(null)
    setMostrarForm(false)
    setCancha('')
    setJugadores('')
    setFechaHora('')
  }}
>
  Cancelar
</button>

          </div>
        )}
      </>
    )}

    <div style={styles.grid}>
      {partidos
        .filter(p => p.estado === filtroEstado)
        .sort((a,b) => {
          if (filtroEstado === 'cerrado') {
            return new Date(b.fecha_hora) - new Date(a.fecha_hora)
          }
          return new Date(a.fecha_hora) - new Date(b.fecha_hora)
        })
        .map((p) => (
        <PartidoCard
          key={p.id}
          partido={p}
          unirse={unirse}
          salirEquipo={salirEquipo}
          eliminarPartido={eliminarPartido}
          esAdmin={esAdmin}
          esModerador={esModerador}
          ver={() => setPartidoEnVivo(p)}
          modoEdicion={modoEdicion}
          onEditar={(p) => {
            setEditando(p)
            setMostrarForm(true)
            setModoEdicion(false)
        }}
        />
      ))}
    </div>

  </>
} />

      <Route path="/stats" element={<Stats />} />
      <Route path="/perfil" element={<Perfil />} />
      <Route path="/reset" element={<ResetPassword />} />
      <Route 
        path="/roles" 
        element={esAdmin ?<PanelRoles /> : <Navigate to="/inicio" /> } />
    </Routes>

    {/* MENÚ */}
    <MenuNavegacion esAdmin={esAdmin} />

  </Pantalla>
)

}

function MenuNavegacion({ esAdmin } ) {
  const navigate = useNavigate()

  return (
    <div style={styles.floatingMenu}>
      <button onClick={() => navigate('/inicio')}>🏠</button>
      <button onClick={() => navigate('/partidos')}>⚽</button>
      <button onClick={() => navigate('/stats')}>📊</button>
      <button onClick={() => navigate('/perfil')}>👤</button>
      {esAdmin && (
      <button onClick={() => navigate('/roles')}>🛠</button>
      )}
    </div>
  )
}

function PartidoCard({ partido, unirse, eliminarPartido, esAdmin, esModerador, ver, salirEquipo, modoEdicion, onEditar
 }) {
  const [conteo, setConteo] = useState({ A: 0, B: 0 })
  const [golesA, setGolesA] = useState(0)
  const [golesB, setGolesB] = useState(0)
  const [jugadoresA, setJugadoresA] = useState([])
  const [jugadoresB, setJugadoresB] = useState([])
  const [miEquipo, setMiEquipo] = useState(null)

  const cargarConteo = async () => {  
  const { data } = await supabase
    .from('partido_jugadores')
    .select('equipo, nombre, usuario_id')
    .eq('partido_id', partido.id)

  setConteo({
    A: data.filter(j => j.equipo === 'A').length,
    B: data.filter(j => j.equipo === 'B').length
  })

  setJugadoresA(data.filter(j => j.equipo === 'A'))
  setJugadoresB(data.filter(j => j.equipo === 'B'))

  // 🔥 traer goles
const { data: goles } = await supabase
  .from('goles')
  .select('equipo')
  .eq('partido_id', partido.id)

const listaGoles = goles || []

setGolesA(listaGoles.filter(g => g.equipo === 'A').length)
setGolesB(listaGoles.filter(g => g.equipo === 'B').length)

const { data: userData } = await supabase.auth.getUser()
const user = userData.user

const miRegistro = data.find(j => j.usuario_id === user.id)

setMiEquipo(miRegistro?.equipo || null)

}

useEffect(() => {
  cargarConteo()

  const canal = supabase
    .channel('jugadores-' + partido.id)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'partido_jugadores',
        filter: `partido_id=eq.${partido.id}`
      },
      () => {
        cargarConteo()
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(canal)
  }
}, [partido.id])

  return (
    <div style={styles.card}>
      {esAdmin || esModerador && modoEdicion && (
  <div style={{
    position: 'absolute',
    top: 8,
    right: 8
  }}>
    <button
      style={{
        background: '#ff9800',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        border: 'none',
        color: 'white',
        borderRadius: 6,
        cursor: 'pointer',
        padding: '4px 6px',
        fontSize: 12,
        zIndex: 10
      }}
      onClick={() => onEditar(partido)}
    >
      ✏️
    </button>
  </div>
)}
      <div style={{ marginBottom: 8 }}>
  <div style={{ fontWeight: 'bold', fontSize: 16 }}>
    {partido.cancha} {partido.estado === 'cerrado' ? '🔒' : '🟢'}
  </div>

  <div style={{ fontSize: 12, opacity: 0.7 }}>
    {new Date(partido.fecha_hora).toLocaleString()}
  </div>
</div>

{/* 🔥 ESTADO DEL USUARIO */}
<div style={{
  textAlign: 'center',
  marginBottom: 6,
  fontSize: 12,
  fontWeight: 'bold',
  padding: '4px 6px',
  borderRadius: 6,
  background:
    miEquipo === 'A'
      ? '#007bff55'
      : miEquipo === 'B'
      ? '#ff4d4d55'
      : '#ffffff22'
}}>
  {miEquipo === 'A' && '🔵 Te uniste al BLUE'}
  {miEquipo === 'B' && '🔴 Te uniste al RED'}
  {!miEquipo && '⚪ No estás en ningún equipo'}
</div>

      <div style={styles.row}>
    <button
  style={{
    ...styles.blueBtn,
    opacity: partido.estado === 'cerrado' ? 0.5 : 1,
    border: miEquipo === 'A' ? '2px solid white' : 'none',
    transform: miEquipo === 'A' ? 'scale(1.05)' : 'scale(1)'
  }}
  disabled={partido.estado === 'cerrado'}
  onClick={async () => {
    if (partido.estado === 'cerrado') {
      alert("El partido está cerrado")
      return
    }

    const { data } = await supabase.auth.getUser()
    const user = data.user

    const { data: actual } = await supabase
      .from('partido_jugadores')
      .select('*')
      .eq('partido_id', partido.id)
      .eq('usuario_id', user.id)
      .maybeSingle()

    if (actual?.equipo === 'A') {
  await salirEquipo(partido.id)
} else {

  // 🔥 VALIDAR CUPO ANTES
  const { data: jugadores } = await supabase
    .from('partido_jugadores')
    .select('*')
    .eq('partido_id', partido.id)
    .eq('equipo', 'A')

  if (jugadores.length >= partido.jugadores) {
    alert('Cupo lleno')
    return
  }

  await salirEquipo(partido.id)
  await unirse(partido.id, 'A', partido.jugadores)
}

    cargarConteo()
  }}
>
  {miEquipo === 'A'
  ? `✔ BLUE (${conteo.A}/${partido.jugadores})`
  : `BLUE (${conteo.A}/${partido.jugadores})`}
</button>

    <button
  style={{
  ...styles.redBtn,
  opacity: partido.estado === 'cerrado' ? 0.5 : 1,
  border: miEquipo === 'B' ? '2px solid white' : 'none',
  transform: miEquipo === 'B' ? 'scale(1.05)' : 'scale(1)'
}}
  disabled={partido.estado === 'cerrado'}
  onClick={async () => {
    if (partido.estado === 'cerrado') {
      alert("El partido está cerrado")
      return
    }

    const { data } = await supabase.auth.getUser()
    const user = data.user

    const { data: actual } = await supabase
      .from('partido_jugadores')
      .select('*')
      .eq('partido_id', partido.id)
      .eq('usuario_id', user.id)
      .maybeSingle()

    if (actual?.equipo === 'B') {
  await salirEquipo(partido.id)
} else {

  // 🔥 VALIDAR CUPO ANTES
  const { data: jugadores } = await supabase
    .from('partido_jugadores')
    .select('*')
    .eq('partido_id', partido.id)
    .eq('equipo', 'B')

  if (jugadores.length >= partido.jugadores) {
    alert('Cupo lleno')
    return
  }

  await salirEquipo(partido.id)
  await unirse(partido.id, 'B', partido.jugadores)
}

    cargarConteo()
  }}
>
  {miEquipo === 'B'
  ? `✔ RED (${conteo.B}/${partido.jugadores})`
  : `RED (${conteo.B}/${partido.jugadores})`}
</button>
</div>

{partido.estado === 'cerrado' && (
  <div style={{
    marginTop: 8,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold'
  }}>
    ⚽ {golesA} - {golesB}

    <div style={{ 
      fontSize: 12, 
      textAlign: 'center',
      opacity: 0.8      
      }}>
      {golesA > golesB && '🔵 Ganó BLUE'}
      {golesB > golesA && '🔴 Ganó RED'}
      {golesA === golesB && '🤝 Empate'}
    </div>
  </div>
)}
      {/*
  <div>
   <div style={{ marginTop: 10 }}>
  <strong>Jugadores:</strong>

  <div style={{ marginTop: 5 }}>
    <small>BLUE:</small>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {jugadoresA.map((j, i) => (
        <div key={i} style={{
          background: '#001f3f',
          padding: '4px 8px',
          borderRadius: 6,
          fontSize: 12
        }}>
          {j.nombre}
        </div>
      ))}
    </div>
  </div>


  <div style={{ marginTop: 5 }}>
    <small>RED:</small>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {jugadoresB.map((j, i) => (
        <div key={i} style={{
          background: '#5a0000',
          padding: '4px 8px',
          borderRadius: 6,
          fontSize: 12
        }}>
          {j.nombre}
        </div>
      ))}
    </div>
  </div>
</div>
  </div>
  */}

      <button style={{
        ...styles.secondaryBtn,
        marginTop: 8,
        padding: '6px',
        fontSize: 12
        }} 
        onClick={ver}
      >
      Ver
      </button>
      
      {esAdmin && (
  <button
    style={{
      ...styles.secondaryBtn,
      marginTop: 8,
      padding: '6px',
      fontSize: 12,
      background: partido.estado === 'cerrado' ? '#2e7d32' : '#b71c1c'
    }}
    onClick={async () => {
      const nuevoEstado = partido.estado === 'cerrado' ? 'abierto' : 'cerrado'

      const confirmar = window.confirm(
        nuevoEstado === 'cerrado'
          ? "¿Cerrar partido?"
          : "¿Reabrir partido?"
      )

      if (!confirmar) return

      const { error } = await supabase
        .from('partidos')
        .update({ estado: nuevoEstado })
        .eq('id', partido.id)

      if (error) {
        console.log(error)
        alert("Error al cambiar estado")
        return
      }

      alert(
        nuevoEstado === 'cerrado'
          ? "Partido cerrado 🔒"
          : "Partido abierto 🟢"
      )

      window.location.reload()
    }}
  >
    {partido.estado === 'cerrado'
      ? 'Abrir Partido 🟢'
      : 'Cerrar Partido 🔒'}
  </button>
)}

      {esAdmin && (
        <button style={{
          ...styles.secondaryBtn,
          marginTop: 8,
          padding: '6px',
          fontSize: 12,
          background: '#000'
        }} 
        onClick={() => {
          const confirmar = window.confirm("¿Eliminar este partido?")
          if (!confirmar) return
          eliminarPartido(partido.id)
        }}>
          Eliminar
        </button>
      )}
    </div>
  )
}

function PartidoEnVivo({ partido,volver,esAdmin,esModerador}) {
  const [jugadoresA, setJugadoresA] = useState([])
  const [jugadoresB, setJugadoresB] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [mostrarSelector, setMostrarSelector] = useState(null) 
  const [goles, setGoles] = useState([])
  const [detalle, setDetalle] = useState(null)

  const golesA = goles.filter(g => g.equipo === 'A').length
  const golesB = goles.filter(g => g.equipo === 'B').length
  const usuariosDisponibles = usuarios.filter(u =>
  ![...jugadoresA, ...jugadoresB]
    .some(j => j.usuario_id === u.usuario_id)
)

  // 🔥 AGRUPAR GOLES SIMPLE (SIN COMPLICARSE)
const agruparSimple = (lista) => {
  const grupos = {}

  lista.forEach(g => {
    const key = `${g.jugador}_${g.equipo}`

    if (!grupos[key]) {
      grupos[key] = {
        jugador: g.jugador,
        equipo: g.equipo,
        minutos: [],
        goles: []
      }
    }

    grupos[key].minutos.push(g.minuto)
    grupos[key].goles.push(g)
  })

  return Object.values(grupos).map(grupo => ({
    ...grupo,
    minutos: grupo.minutos.sort((a, b) => a - b)
  }))
}

// separar por equipos
const gruposA = agruparSimple(goles.filter(g => g.equipo === 'A'))
const gruposB = agruparSimple(goles.filter(g => g.equipo === 'B'))

  const cargarTodo = async () => {
    const { data: golesData } = await supabase
      .from('goles')
      .select('*')
      .eq('partido_id', partido.id)
      .order('minuto', { ascending: true })

    setGoles(golesData || [])

    const { data: jugadores } = await supabase
      .from('partido_jugadores')
      .select('nombre, equipo, usuario_id')
      .eq('partido_id', partido.id)

    setJugadoresA(jugadores.filter(j => j.equipo === 'A'))
    setJugadoresB(jugadores.filter(j => j.equipo === 'B'))
  }

  const registrarGol = async (equipo, jugadorObj) => {
  const minuto = prompt("Minuto del gol (ej: 23)")
  if (!minuto) return

  await supabase.from('goles').insert({
    partido_id: partido.id,
    equipo,
    jugador: jugadorObj.nombre,
    usuario_id: jugadorObj.usuario_id || null,
    minuto: Number(minuto)
  })

  cargarTodo()
}

  const eliminarGol = async (id) => {

    if (partido.estado === 'cerrado') {
      alert("Partido cerrado, no se pueden eliminar goles")
      return
    }

    const confirmar = confirm("¿Eliminar este gol?")

  if (!confirmar) return

  const { error } = await supabase
    .from('goles')
    .delete()
    .eq('id', id)

  if (error) {
    console.log("ERROR ELIMINAR GOL:", error)
    alert("No se pudo eliminar el gol")
    return
  }

  cargarTodo()
}

const eliminarJugador = async (usuario_id) => {

  if (partido.estado === 'cerrado') {
    alert("No puedes modificar jugadores en un partido cerrado")
    return
  }

  const confirmar = confirm("¿Eliminar jugador del partido?")
  if (!confirmar) return

  const { error } = await supabase
    .from('partido_jugadores')
    .delete()
    .eq('partido_id', partido.id)
    .eq('usuario_id', usuario_id)

  if (error) {
    console.log("ERROR ELIMINAR JUGADOR:", error)
    alert("No se pudo eliminar el jugador")
    return
  }

  cargarTodo()
}

const cargarUsuarios = async () => {
  const { data } = await supabase
    .from('perfil_usuario')
    .select('usuario_id, nombre')

  setUsuarios(data || [])
}

useEffect(() => {
  cargarUsuarios()
}, [])

const agregarJugadorManual = async (usuario, equipo) => {
  // evitar duplicados
  const yaExiste = [...jugadoresA, ...jugadoresB]
    .some(j => j.usuario_id === usuario.usuario_id)

  if (yaExiste) {
    alert("El jugador ya está en el partido")
    return
  }

  const { error } = await supabase
    .from('partido_jugadores')
    .insert({
      partido_id: partido.id,
      usuario_id: usuario.usuario_id,
      equipo,
      nombre: usuario.nombre
    })

  if (error) {
    console.log("ERROR INSERTAR JUGADOR:", error)
    alert("No se pudo agregar el jugador")
    return
  }

  setMostrarSelector(null)
  cargarTodo()
}
  useEffect(() => {
    cargarTodo()

    const canal = supabase
      .channel('full-' + partido.id)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'goles', filter: `partido_id=eq.${partido.id}` },
        () => cargarTodo()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'partido_jugadores', filter: `partido_id=eq.${partido.id}` },
        () => cargarTodo()
      )
      .subscribe()

    return () => supabase.removeChannel(canal)
  }, [partido.id])

  return (
    <Pantalla>
      <h1 style={styles.brandSmall}>Partido En Vivo</h1>

      <div style={styles.scoreContainer}>
        <div style={styles.teamScore}>
          <span>BLUE</span>
          <span style={styles.score}>{golesA}</span>
        </div>

        <div style={styles.vs}>VS</div>

        <div style={styles.teamScore}>
          <span>RED</span>
          <span style={styles.score}>{golesB}</span>
        </div>
      </div>

      <h3 style={{ marginTop: 30 }}>Eventos del partido</h3>
      {console.log("GOLES:", goles)}
      <div style={{ marginTop: 10 }}>

  {/* 🔵 BLUE */}
  {gruposA.map((grupo, i) => (
    <div
      key={i}
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        margin: '6px 0'
      }}
    >
      <div style={{
        background: '#007bff33',
        padding: '4px 8px',
        fontSize: 13,
        borderRadius: 10,
        maxWidth: '70%'
      }}>

        {/* TEXTO PRINCIPAL */}
        <div
          style={{ cursor: 'pointer' }}
          onClick={() => {
            const key = `${grupo.jugador}_A`
  setDetalle(detalle === key ? null : key)
}}
        >
          ⚽ {grupo.jugador} ({grupo.minutos.length})
        </div>

        {/* DETALLE */}
        {detalle === `${grupo.jugador}_A` && (
          <div style={{ marginTop: 4 }}>
            {grupo.goles.map(g => (
              <div key={g.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                <span>{g.minuto}'</span>

                {partido.estado === 'abierto' && (esAdmin || esModerador) && (
                  <button
                    style={{
                      background: 'red',
                      border: 'none',
                      color: 'white',
                      borderRadius: 6,
                      width: 16,
                      height: 16,
                      fontSize: 10,
                      cursor: 'pointer'
                    }}
                    onClick={() => eliminarGol(g.id)}
                  >
                    ❌
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  ))}

  {/* 🔴 RED */}
  {gruposB.map((grupo, i) => (
    <div
      key={i}
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        margin: '6px 0'
      }}
    >
      <div style={{
        background: '#ff4d4d33',
        padding: '4px 8px',
        fontSize: 13,
        borderRadius: 10,
        maxWidth: '70%',
        textAlign: 'right'
      }}>

        {/* TEXTO PRINCIPAL */}
        <div
          style={{ cursor: 'pointer' }}
          onClick={() => {
  const key = `${grupo.jugador}_B`
  setDetalle(detalle === key ? null : key)
}}
        >
          ({grupo.minutos.length}) {grupo.jugador} ⚽
        </div>

        {/* DETALLE */}
        {detalle === `${grupo.jugador}_B` && (
          <div style={{ marginTop: 4 }}>
            {grupo.goles.map(g => (
              <div key={g.id} style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 4
              }}>
                <span>{g.minuto}'</span>

                {partido.estado === 'abierto' && (esAdmin || esModerador) && (
                  <button
                    style={{
                      background: 'red',
                      border: 'none',
                      color: 'white',
                      borderRadius: 6,
                      width: 16,
                      height: 16,
                      fontSize: 10,
                      cursor: 'pointer'
                    }}
                    onClick={() => eliminarGol(g.id)}
                  >
                    ❌
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  ))}
</div>

      <div style={styles.playersWrapper}>
        <div style={styles.teamBox}>
         <h3>BLUE</h3>

<div style={{
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 4
}}>
  {jugadoresA.map((j, i) => (
            
  <div
    key={i}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }}
  >

    {/* BOTÓN PARA GOL */}
    <button
      style={{ ...styles.blueBtn, flex: 1, padding: '4px 6px', fontSize: 12 }}
      onClick={() => {
        if (partido.estado === 'cerrado') {
          alert("Partido cerrado")
          return
        }
        registrarGol('A', j)
      }}
    >
      {j.nombre}
    </button>

    {/* BOTÓN ADMIN ❌ */}
    {(esAdmin || esModerador) && partido.estado === 'abierto' && (
      <button
        style={{
          background: 'red',
          border: 'none',
          color: 'white',
          borderRadius: 6,
          width: 16,
          height: 16,
          fontSize: 10,
          cursor: 'pointer'
        }}
        onClick={() => eliminarJugador(j.usuario_id)}
      >
        ❌
      </button>
    )}
  </div>
))}
</div>


      {/* 🔥 BOTÓN DESCONOCIDO BLUE */}
<div style={{ marginTop: 6 }}>
  <button
    style={{ ...styles.blueBtn, width: '100%', opacity: 0.7 }}
    onClick={() => {
      if (partido.estado === 'cerrado') {
        alert("Partido cerrado")
        return
      }

      registrarGol('A', {
        nombre: 'Desconocido',
        usuario_id: null
      })
    }}
  >
    ⚽ Desconocido
  </button>

{(esAdmin || esModerador) && partido.estado === 'abierto' && (
  <button
    style={{
      marginTop: 6,
      width: '100%',
      background: '#ffffff22',
      border: 'none',
      padding: 6,
      borderRadius: 6,
      cursor: 'pointer'
    }}
    onClick={() => setMostrarSelector('A')}
  >
    ➕ Agregar Jugador
  </button>
)}

</div>
        </div>

        <div style={styles.teamBox}>
          <h3>RED</h3>

  <div style={{
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 4
}}>
  {jugadoresB.map((j, i) => (
    <div
      key={i}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4
      }}
    >
    {/* BOTÓN PARA GOL */}
    <button
      style={{ ...styles.redBtn, flex: 1, padding: '4px 6px', fontSize: 12 }}
      onClick={() => {
        if (partido.estado === 'cerrado') {
          alert("Partido cerrado")
          return
        }
        registrarGol('B', j)
      }}
    >
      {j.nombre}
    </button>

    {/* BOTÓN ADMIN ❌ */}
    {(esAdmin || esModerador) && partido.estado === 'abierto' && (
      <button
        style={{
          background: 'black',
          border: 'none',
          color: 'white',
          borderRadius: 6,
          width: 16,
          height: 16,
          fontSize: 10,
          cursor: 'pointer'
        }}
        onClick={() => eliminarJugador(j.usuario_id)}
      >
        ❌
      </button>
    )}
  </div>
))}
</div>

{/* 🔥 BOTÓN DESCONOCIDO RED */}
<div style={{ marginTop: 6 }}>
  <button
    style={{ ...styles.redBtn, width: '100%', opacity: 0.7 }}
    onClick={() => {
      if (partido.estado === 'cerrado') {
        alert("Partido cerrado")
        return
      }

      registrarGol('B', {
        nombre: 'Desconocido',
        usuario_id: null
      })
    }}
  >
    ⚽ Desconocido
  </button>

{(esAdmin || esModerador) && partido.estado === 'abierto' && (
  <button
    style={{
      marginTop: 6,
      width: '100%',
      background: '#ffffff22',
      border: 'none',
      padding: 6,
      borderRadius: 6,
      cursor: 'pointer'
    }}
    onClick={() => setMostrarSelector('B')}
  >
    ➕ Agregar Jugador
  </button>
)}

</div>

        </div>

      </div>

      {/* 🔥 MODAL AGREGAR JUGADOR */}
      {mostrarSelector && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: '#000000cc',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999
        }}>
          <div style={{
            background: '#111',
            padding: 20,
            borderRadius: 10,
            width: 300,
            maxHeight: 400,
            overflowY: 'auto'
          }}>

            <h3 style={{ marginBottom: 10 }}>Seleccionar Jugador</h3>

            {usuariosDisponibles.map(u => (
              <div
                key={u.usuario_id}
                style={{
                  padding: 8,
                  borderBottom: '1px solid #333',
                  cursor: 'pointer'
                }}
                onClick={() => agregarJugadorManual(u, mostrarSelector)}
              >
                {u.nombre}
              </div>
            ))}

            {usuariosDisponibles.length === 0 && (
            <div style={{
            textAlign: 'center',
            marginTop: 10,
           opacity: 0.7
             }}>
    Todos los jugadores ya están en el partido
  </div>
)}

            <button
              style={{
                marginTop: 10,
                width: '100%',
                padding: 6,
                background: 'red',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer'
              }}
              onClick={() => setMostrarSelector(null)}
            >
              Cancelar
            </button>

          </div>
        </div>
      )}

      <button style={styles.deleteBtn} onClick={volver}>
        Volver
      </button>
    </Pantalla>
  )
}

function Pantalla({ children }) {
  return (
    <div style={styles.bg}>
      <div style={styles.overlay}>{children}</div>
    </div>
  )
}

function AuthEmail() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [modo, setModo] = useState('login')
  const [nombre, setNombre] = useState('')

const handleAuth = async () => {

  if (modo === 'login') {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      alert(error.message)
      return
    }

    const nombre = data.user?.user_metadata?.nombre

    if (!nombre) {
      alert("Debes crear tu cuenta con nombre primero")
      await supabase.auth.signOut()
      return
    }

    window.location.reload()
  }

  else {

    if (!nombre) {
      alert("Debes ingresar tu nombre")
      return
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre: nombre
        }
      }
    })

    if (error) {
      alert(error.message)
    } else {
      alert("Cuenta creada, ahora inicia sesión")
      setModo('login')
    }
  }
}

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      maxWidth: 300,
      margin: 'auto'
    }}>

        {modo === 'register' && (
      <input
        placeholder="Nombre completo"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        style={styles.input}
      />
    )}

      <input
        placeholder="Correo"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={styles.input}
      />

      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={styles.input}
      />

      <button style={styles.primaryBtn} onClick={handleAuth}>
        {modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
      </button>

    {modo === 'login' && (
  <button
    style={{ ...styles.secondaryBtn, marginTop: 5 }}
    onClick={async () => {
      if (!email) {
        alert('Ingresa tu correo primero')
        return
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset'
      })

      if (error) {
        console.log(error)
        alert('Error enviando correo')
        return
      }

      alert('Correo enviado 📩 revisa tu email')
    }}
  >
    ¿Olvidaste tu contraseña?
  </button>
)}

      <button
        style={styles.secondaryBtn}
        onClick={() =>
          setModo(modo === 'login' ? 'register' : 'login')
        }
      >
        {modo === 'login'
          ? '¿No tienes cuenta? Regístrate'
          : '¿Ya tienes cuenta? Inicia Sesión'}
      </button>
    </div>
  )
}

function ResetPassword() {
  const [password, setPassword] = useState('')

  const cambiarPassword = async () => {
    if (!password) {
      alert('Ingresa una contraseña')
      return
    }

    const { error } = await supabase.auth.updateUser({
      password
    })

    if (error) {
      console.log(error)
      alert('Error al cambiar contraseña')
      return
    }

    alert('Contraseña actualizada ✔')
    window.location.href = '/'
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Nueva contraseña</h2>

      <input
        type="password"
        placeholder="Nueva contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={styles.input}
      />

      <button style={styles.primaryBtn} onClick={cambiarPassword}>
        Guardar
      </button>
    </div>
  )
}

function Stats() {
  const [vista, setVista] = useState('resumen')
  const [tablaGlobal, setTablaGlobal] = useState([])
  const [tablaAmericano, setTablaAmericano] = useState([])
  const [tablaColon, setTablaColon] = useState([])
  const [goleadores, setGoleadores] = useState([])
  const [mvp, setMvp] = useState(null)

  const calcularTabla = (partidos, goles) => {
    const equipos = {
      A: { nombre: 'BLUE', PJ: 0, G: 0, E: 0, P: 0, GF: 0, GC: 0 },
      B: { nombre: 'RED', PJ: 0, G: 0, E: 0, P: 0, GF: 0, GC: 0 }
    }

    partidos.forEach(p => {
      const golesPartido = goles.filter(g => g.partido_id === p.id)

      const golesA = golesPartido.filter(g => g.equipo === 'A').length
      const golesB = golesPartido.filter(g => g.equipo === 'B').length

      equipos.A.PJ++
      equipos.B.PJ++

      equipos.A.GF += golesA
      equipos.A.GC += golesB

      equipos.B.GF += golesB
      equipos.B.GC += golesA

      if (golesA > golesB) {
        equipos.A.G++
        equipos.B.P++
      } else if (golesB > golesA) {
        equipos.B.G++
        equipos.A.P++
      } else {
        equipos.A.E++
        equipos.B.E++
      }
    })

    return Object.values(equipos)
  }

  const cargarStats = async () => {
    const { data: partidos } = await supabase
      .from('partidos')
      .select('*')
      .eq('estado', 'cerrado')

      if (!partidos) return

    const partidosIds = partidos.map(p => p.id)
    const { data: goles } = await supabase
      .from('goles')
      .select('*')
      .in('partido_id', partidosIds)

      if (!goles) return

  // 🔥 SOLO GOLES CON USUARIO REAL
  const golesValidos = goles.filter(g => g.usuario_id)

  // 🏆 TABLAS EQUIPOS
  setTablaGlobal(calcularTabla(partidos, goles))

    const partidosAmericano = partidos.filter(p => p.cancha === 'Americano')
  setTablaAmericano(calcularTabla(partidosAmericano, goles))

    const partidosColon = partidos.filter(p => p.cancha === 'Colon')
    setTablaColon(calcularTabla(partidosColon, goles))

const conteo = {}

golesValidos.forEach(g => {
  if (!conteo[g.usuario_id]) {
    conteo[g.usuario_id] = {
      nombre: g.jugador,
      goles: 0,
      americano: 0,
      colon: 0,
      partidos: new Set()
    }
  }

  conteo[g.usuario_id].goles++
  conteo[g.usuario_id].partidos.add(g.partido_id)

  // 🔥 identificar cancha
  const partido = partidos.find(p => p.id === g.partido_id)

  if (partido?.cancha === 'Americano') {
    conteo[g.usuario_id].americano++
  }

  if (partido?.cancha === 'Colon') {
    conteo[g.usuario_id].colon++
  }
})

// 🔥 convertir a array
const ranking = Object.values(conteo)
  .map(j => ({
    ...j,
    partidosJugados: j.partidos.size,
    promedio: (j.goles / (j.partidos.size || 1)).toFixed(2)
  }))
  .sort((a, b) => b.goles - a.goles)

setGoleadores(ranking)
setMvp(ranking[0] || null)
  }

  useEffect(() => {
    cargarStats()
  }, [])

 const renderTabla = (titulo, tabla) => (
  <div style={{ marginBottom: 15 }}>
    <h3>{titulo}</h3>

    <div style={{
      display: 'flex',
      gap: 10,
      flexWrap: 'wrap'
    }}>
      {tabla.map((t, i) => (
        <div key={i} style={{
          background: '#0006',
          padding: 15,
          borderRadius: 12,
          minWidth: 120,
          textAlign: 'center',
          flex: '1'
        }}>
          <h4 style={{ marginBottom: 10 }}>{t.nombre}</h4>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 14
          }}>
            <span>PJ {t.PJ}</span>
            <span>G {t.G}</span>
            <span>E {t.E}</span>
            <span>P {t.P}</span>
          </div>

          <div style={{
            marginTop: 10,
            fontSize: 14
          }}>
            ⚽ {t.GF} | 🥅 {t.GC}
          </div>
        </div>
      ))}
    </div>
  </div>
)

return (
  <div>

    <h2 style={{ textAlign: 'center' }}>📊 Dashboard</h2>

    {/* 🔘 BOTONES */}
    <div style={{
      display: 'flex',
      gap: 10,
      marginBottom: 20
    }}>
      <button onClick={() => setVista('resumen')}>🏠 Resumen</button>
      <button onClick={() => setVista('equipos')}>📊 Equipos</button>
      <button onClick={() => setVista('jugador')}>👤 Jugador</button>
    </div>

    {/* 🏠 RESUMEN */}
    {vista === 'resumen' && (
      <>
        <h3>🏆 Global Equipos</h3>
        {renderTabla('🌍 Global', tablaGlobal)}

        <h3 style={{ marginTop: 30 }}>🥇 Top 5 Jugadores</h3>

        {goleadores.slice(0, 5).map((g, i) => (
          <div key={i} style={{
            background: i === 0 ? '#FFD70033' : '#0006',
            padding: 10,
            margin: '5px 0',
            borderRadius: 8
          }}>
            #{i + 1} {g.nombre} - {g.goles} ⚽ | {g.partidosJugados} PJ | {g.promedio} prom
          </div>
        ))}
      </>
    )}

    {/* 📊 EQUIPOS DETALLADO */}
    {vista === 'equipos' && (
      <>
        <h3>📊 Estadísticas Por Cancha</h3>

        {renderTabla('🏟️ Americano', tablaAmericano)}
        {renderTabla('🏟️ Colón', tablaColon)}
      </>
    )}

    {/* 👤 JUGADOR DETALLADO */}
    {vista === 'jugador' && (
      <JugadorDetalle goleadores={goleadores} />
    )}

  </div>
)
}

function JugadorDetalle({ goleadores }) {
  const [jugador, setJugador] = useState(null)

  return (
    <div>

      <h3>👤 Seleccionar Jugador</h3>

      <select
        style={{ padding: 10, marginBottom: 20 }}
        onChange={(e) => {
          const seleccionado = goleadores.find(g => g.nombre === e.target.value)
          setJugador(seleccionado)
        }}
      >
        <option value="">Seleccionar...</option>

        {goleadores.map((g, i) => (
          <option key={i} value={g.nombre}>
            {g.nombre}
          </option>
        ))}
      </select>

      {jugador && (
        <div style={{
          background: '#0006',
          padding: 15,
          borderRadius: 10
        }}>
          <h3>{jugador.nombre}</h3>

          <p>⚽ Goles: {jugador.goles}</p>
          <p>📊 Promedio: {jugador.promedio}</p>
          <p>🏟️ Americano: {jugador.americano}</p>
          <p>🏟️ Colón: {jugador.colon}</p>
        </div>
      )}

    </div>
  )
}

function Perfil() {
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState(null)
  const [equipo, setEquipo] = useState(null)

  useEffect(() => {
    cargarPerfil()
  }, [])

const cargarPerfil = async () => {
  const { data: userData } = await supabase.auth.getUser()
  const u = userData?.user

  if (!u) {
    console.log("No hay usuario")
    return
  }

  setUser(u)

  // 🔥 traer goles
  const { data: goles, error: errorGoles } = await supabase
    .from('goles')
    .select('*')
    .eq('usuario_id', u.id)

  if (errorGoles) console.log("Error goles:", errorGoles)

  // 🔥 traer partidos
  const { data: partidos, error: errorPartidos } = await supabase
    .from('partidos')
    .select('id, cancha')

  if (errorPartidos) console.log("Error partidos:", errorPartidos)

  console.log("USER:", u)
  console.log("GOLES:", goles)
  console.log("PARTIDOS:", partidos)

  let total = 0
  let blue = 0
  let red = 0
  let americano = 0
  let colon = 0

  ;(goles || []).forEach(g => {
    total++

    if (g.equipo === 'A') blue++
    if (g.equipo === 'B') red++

    const partido = (partidos || []).find(p => p.id === g.partido_id)

    if (partido?.cancha === 'Americano') americano++
    if (partido?.cancha === 'Colon') colon++
  })

  setStats({
    total,
    blue,
    red,
    americano,
    colon
  })

  // 🔥 equipo preferido
  const { data } = await supabase
    .from('perfil_usuario')
    .select('*')
    .eq('usuario_id', u.id)
    .maybeSingle()

  setEquipo(data?.equipo_preferido || null)
}

  const guardarEquipo = async (eq) => {
    const user = (await supabase.auth.getUser()).data.user

    await supabase
      .from('perfil_usuario')
      .upsert({
        usuario_id: user.id,
        equipo_preferido: eq
      })

    setEquipo(eq)
  }

  if (!user || !stats) return <p>Cargando...</p>

const cardStat = {
  flex: 1,
  background: '#0006',
  padding: 15,
  borderRadius: 12,
  textAlign: 'center'
}
  
  return (
  <div>

    {/* 👤 HEADER */}
    <div style={{
      background: '#0006',
      padding: 20,
      borderRadius: 15,
      marginBottom: 20
    }}>
      <h2>
        👤 {user.user_metadata?.nombre || user.email}
      </h2>

      <p style={{ opacity: 0.8 }}>
        📧 {user.email}
      </p>
    </div>

    {/* ⚽ STATS */}
    <h3>⚽ Estadísticas</h3>

    <div style={{
      display: 'flex',
      gap: 10,
      flexWrap: 'wrap',
      marginTop: 10
    }}>

      <div style={cardStat}>
        <h3>⚽</h3>
        <p>{stats.total}</p>
        <small>Total</small>
      </div>

      <div style={{ ...cardStat, background: '#007bff33' }}>
        <h3>🔵</h3>
        <p>{stats.blue}</p>
        <small>BLUE</small>
      </div>

      <div style={{ ...cardStat, background: '#ff4d4d33' }}>
        <h3>🔴</h3>
        <p>{stats.red}</p>
        <small>RED</small>
      </div>

      <div style={cardStat}>
        <h3>🏟️</h3>
        <p>{stats.americano}</p>
        <small>Americano</small>
      </div>

      <div style={cardStat}>
        <h3>🏟️</h3>
        <p>{stats.colon}</p>
        <small>Colón</small>
      </div>

    </div>

    {/* ⭐ EQUIPO */}
    <div style={{ marginTop: 30 }}>

      <h3>⭐ Equipo Preferido</h3>

      <div style={{
        display: 'flex',
        gap: 10,
        marginTop: 10
      }}>

        <button
          style={{
            ...styles.blueBtn,
            flex: 1,
            opacity: equipo === 'A' ? 1 : 0.5,
            border: equipo === 'A' ? '2px solid white' : 'none'
          }}
          onClick={() => guardarEquipo('A')}
        >
          🔵 BLUE
        </button>

        <button
          style={{
            ...styles.redBtn,
            flex: 1,
            opacity: equipo === 'B' ? 1 : 0.5,
            border: equipo === 'B' ? '2px solid white' : 'none'
          }}
          onClick={() => guardarEquipo('B')}
        >
          🔴 RED
        </button>

      </div>

    </div>

  </div>
)
}

function PanelRoles() {
  const [usuarios, setUsuarios] = useState([])

  const cargarUsuarios = async () => {
    const { data, error } = await supabase
      .from('perfil_usuario')
      .select(`
        usuario_id,
        nombre,
        email,
        roles_usuario ( rol )
      `)

    if (error) {
      console.log("Error cargando usuarios:", error)
      return
    }

    setUsuarios(data)
  }

  const cambiarRol = async (userId, nuevoRol) => {
    const { error } = await supabase
      .from('roles_usuario')
      .upsert({
        id: userId,
        rol: nuevoRol
      })

    if (error) {
      alert("Error al cambiar rol")
      return
    }

    cargarUsuarios()
  }

  useEffect(() => {
    cargarUsuarios()
  }, [])

  return (
    <div style={{ padding: 20 }}>
      <h2>🛠 Panel de Roles</h2>

      {usuarios.map((u) => (
        <div key={u.usuario_id} style={{
          background: '#0006',
          padding: 10,
          margin: '5px 0',
          borderRadius: 8
        }}>
          <div><strong>{u.nombre || 'Sin nombre'}</strong></div>

          <div style={{ fontSize: 12, opacity: 0.7 }}>
            {u.email}
          </div>

          <div style={{ marginTop: 5 }}>
            Rol: {u.roles_usuario?.rol || 'jugador'}
          </div>

          <div style={{ display: 'flex', gap: 5, marginTop: 5 }}>
            <button onClick={() => cambiarRol(u.usuario_id, 'jugador')}>
              Jugador
            </button>

            <button onClick={() => cambiarRol(u.usuario_id, 'moderador')}>
              Moderador
            </button>

            <button onClick={() => cambiarRol(u.usuario_id, 'admin')}>
              Admin
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

const styles = {
  bg: {
    backgroundImage: `url(${fondo})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    minHeight: '100vh',
    width: '100%',
    fontFamily: 'Oswald, sans-serif'
  },
  overlay: {
    backdropFilter: 'blur(6px)',
    background: 'rgba(0,0,0,0.55)',
    minHeight: '100vh',
    width: '100%',
    padding: 30,
    color: 'white',
    boxSizing: 'border-box'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20
  },
  logoutBtn: {
    background: '#000',
    color: 'white',
    padding: '8px 14px',
    borderRadius: 10,
    border: 'none'
  },
  brand: { fontSize: 70 },
  brandSmall: { fontSize: 40 },
  grid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 20
  },
  card: {
    position: 'relative',
    background: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    padding: 12,
    flex: '1 1 240px',
    maxWidth: 260,
  },
  row: {
    display: 'flex',
    gap: 4,
    marginTop: 6
  },
  primaryBtn: {
    background: '#00c853',
    color: 'white',
    padding: '10px 20px',
    borderRadius: 10,
    border: 'none'
  },
  secondaryBtn: {
    background: '#ffffff22',
    color: 'white',
    padding: '8px',
    borderRadius: 8,
    border: 'none'
  },
  blueBtn: {
  background: '#007bff',
  color: 'white',
  border: 'none',
  padding: '6px',
  borderRadius: 6,
  textAlign: 'center',
  flex: 1,
  fontSize: 12,
  cursor: 'pointer'
},
  redBtn: {
  background: '#ff4d4d',
  color: 'white',
  border: 'none',
  padding: '6px',
  borderRadius: 6,
  textAlign: 'center',
  flex: 1,
  fontSize: 12,
  cursor: 'pointer'
},
  deleteBtn: {
    marginTop: 20,
    background: '#000',
    color: 'white',
    padding: '10px',
    borderRadius: 10,
    border: 'none'
  },
  scoreContainer: {
    display: 'flex',
    justifyContent: 'space-around',
    marginTop: 40
  },
  teamScore: {
    textAlign: 'center'
  },
  score: {
    fontSize: 80
  },
  vs: {
    fontSize: 20
  },
  controls: {
    display: 'flex',
    justifyContent: 'space-around',
    marginTop: 20
  },
  playersWrapper: {
    display: 'flex',
    justifyContent: 'center',
    gap: 40,
    marginTop: 40,
    flexWrap: 'wrap'
  },
  teamBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  cardForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginBottom: 20
  },
  input: {
    padding: 10,
    borderRadius: 8,
    border: 'none'
  }
}


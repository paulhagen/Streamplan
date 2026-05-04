import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { TeapotGeometry } from 'three/addons/geometries/TeapotGeometry.js'

const W = 16, H = 12, D = 10
const CELL = 2.8
const CAM_POS = new THREE.Vector3(CELL * 0.6, CELL * 0.8, CELL * 13.5)
const CAM_TARGET = new THREE.Vector3(0, 0, 0)
const PIPE_R = 0.42
const JOINT_R = 0.62
const TICK_MS = 30
const MAX_PIPES = 1
const TEAPOT_CHANCE = 0.018
const TURN_CHANCE = 0.40
const RESTART_FILL = 0.72

const PALETTE = [
  0xff2222, 0x2244ff, 0xffdd00, 0x00ddcc,
  0xff44ff, 0x44dd44, 0xff8800, 0xcccccc,
  0xff8888, 0x8899ff,
]

const DIRS: [number, number, number][] = [
  [1, 0, 0], [-1, 0, 0],
  [0, 1, 0], [0, -1, 0],
  [0, 0, 1], [0, 0, -1],
]

const Y_UP = new THREE.Vector3(0, 1, 0)

interface Pipe {
  pos: [number, number, number]
  dir: [number, number, number]
  mat: THREE.MeshPhongMaterial
}

export function PipesScreen() {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = mountRef.current!
    let mounted = true

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)

    const camera = new THREE.PerspectiveCamera(52, el.clientWidth / el.clientHeight, 0.1, 1000)
    camera.position.copy(CAM_POS)
    camera.lookAt(CAM_TARGET)

    function onResize() {
      const w = el.clientWidth, h = el.clientHeight
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    onResize()
    const ro = new ResizeObserver(onResize)
    ro.observe(el)

    scene.add(new THREE.AmbientLight(0xffffff, 0.45))
    const sun = new THREE.DirectionalLight(0xffffff, 0.85)
    sun.position.set(20, 30, 25)
    scene.add(sun)
    const fill = new THREE.DirectionalLight(0xffffff, 0.25)
    fill.position.set(-15, -10, -20)
    scene.add(fill)

    const cylGeom = new THREE.CylinderGeometry(PIPE_R, PIPE_R, CELL, 8)
    const jointGeom = new THREE.SphereGeometry(JOINT_R, 10, 7)
    const teapotGeom = new TeapotGeometry(JOINT_R * 1.15, 3)

    const occupied = new Set<string>()
    const totalCells = W * H * D
    const pipes: Pipe[] = []
    const meshes: THREE.Mesh[] = []
    const materials: THREE.MeshPhongMaterial[] = []

    function key(x: number, y: number, z: number) { return `${x},${y},${z}` }
    function inBounds(x: number, y: number, z: number) {
      return x >= 0 && x < W && y >= 0 && y < H && z >= 0 && z < D
    }
    function toWorld(x: number, y: number, z: number) {
      return new THREE.Vector3(
        (x - W / 2 + 0.5) * CELL,
        (y - H / 2 + 0.5) * CELL,
        (z - D / 2 + 0.5) * CELL,
      )
    }

    function addMesh(mesh: THREE.Mesh) {
      scene.add(mesh)
      meshes.push(mesh)
    }

    function addSegment(mat: THREE.MeshPhongMaterial, from: THREE.Vector3, to: THREE.Vector3) {
      const dir = new THREE.Vector3().subVectors(to, from).normalize()
      const mesh = new THREE.Mesh(cylGeom, mat)
      mesh.position.addVectors(from, to).multiplyScalar(0.5)
      mesh.quaternion.setFromUnitVectors(Y_UP, dir)
      addMesh(mesh)
    }

    function addJoint(mat: THREE.MeshPhongMaterial, worldPos: THREE.Vector3, isTeapot: boolean) {
      const geom = isTeapot ? teapotGeom : jointGeom
      const mesh = new THREE.Mesh(geom, mat)
      mesh.position.copy(worldPos)
      if (isTeapot) {
        mesh.rotation.x = Math.PI / 2
        mesh.rotation.y = Math.random() * Math.PI * 2
      }
      addMesh(mesh)
    }

    function randomFreeStart(): [number, number, number] | null {
      for (let i = 0; i < 300; i++) {
        const x = Math.floor(Math.random() * W)
        const y = Math.floor(Math.random() * H)
        const z = Math.floor(Math.random() * D)
        if (!occupied.has(key(x, y, z))) return [x, y, z]
      }
      return null
    }

    function spawnPipe() {
      const start = randomFreeStart()
      if (!start) return
      const [x, y, z] = start
      occupied.add(key(x, y, z))
      const color = PALETTE[Math.floor(Math.random() * PALETTE.length)]
      const mat = new THREE.MeshPhongMaterial({
        color,
        shininess: 90,
        specular: new THREE.Color(0x555555),
      })
      materials.push(mat)
      addJoint(mat, toWorld(x, y, z), false)
      const dir = DIRS[Math.floor(Math.random() * DIRS.length)]
      pipes.push({ pos: [x, y, z], dir: [...dir] as [number, number, number], mat })
    }

    function clearAll() {
      meshes.forEach(m => scene.remove(m))
      meshes.length = 0
      materials.forEach(m => m.dispose())
      materials.length = 0
      occupied.clear()
      pipes.length = 0
    }

    let restarting = false

    function restart() {
      restarting = true
      clearAll()
      if (mounted) {
        setTimeout(() => {
          restarting = false
          if (mounted) spawnPipe()
        }, 1800)
      }
    }

    function stepPipes() {
      if (restarting) return
      if (occupied.size / totalCells > RESTART_FILL) {
        restart()
        return
      }

      while (pipes.length < MAX_PIPES) spawnPipe()

      let i = 0
      while (i < pipes.length) {
        const pipe = pipes[i]
        const [px, py, pz] = pipe.pos
        const [dx, dy, dz] = pipe.dir
        const nx = px + dx, ny = py + dy, nz = pz + dz

        let moved = false

        if (inBounds(nx, ny, nz) && !occupied.has(key(nx, ny, nz)) && Math.random() > TURN_CHANCE) {
          addSegment(pipe.mat, toWorld(px, py, pz), toWorld(nx, ny, nz))
          occupied.add(key(nx, ny, nz))
          pipe.pos = [nx, ny, nz]
          moved = true
        } else {
          const shuffled = [...DIRS].sort(() => Math.random() - 0.5)
          for (const [ddx, ddy, ddz] of shuffled) {
            if (ddx === dx && ddy === dy && ddz === dz) continue
            const mx = px + ddx, my = py + ddy, mz = pz + ddz
            if (inBounds(mx, my, mz) && !occupied.has(key(mx, my, mz))) {
              addJoint(pipe.mat, toWorld(px, py, pz), Math.random() < TEAPOT_CHANCE)
              addSegment(pipe.mat, toWorld(px, py, pz), toWorld(mx, my, mz))
              occupied.add(key(mx, my, mz))
              pipe.pos = [mx, my, mz]
              pipe.dir = [ddx, ddy, ddz]
              moved = true
              break
            }
          }
        }

        if (!moved) {
          pipes.splice(i, 1)
        } else {
          i++
        }
      }
    }

    spawnPipe()

    const ticker = setInterval(stepPipes, TICK_MS)

    let rafId: number
    function render() {
      rafId = requestAnimationFrame(render)
      renderer.render(scene, camera)
    }
    render()

    return () => {
      mounted = false
      ro.disconnect()
      clearInterval(ticker)
      cancelAnimationFrame(rafId)
      clearAll()
      cylGeom.dispose()
      jointGeom.dispose()
      teapotGeom.dispose()
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div
      ref={mountRef}
      style={{ width: '100%', height: '100vh', background: '#000', overflow: 'hidden' }}
    />
  )
}
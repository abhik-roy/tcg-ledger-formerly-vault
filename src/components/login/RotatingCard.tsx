"use client"

import { Canvas, useFrame, useLoader } from "@react-three/fiber"
import { Suspense, useEffect, useRef } from "react"
import * as THREE from "three"

interface CardMeshProps {
  frontUrl: string
  backUrl: string
  speed?: number
  initialRotationY?: number
}

function CardMesh({ frontUrl, backUrl, speed = 0.35, initialRotationY = 0 }: CardMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [frontTex, backTex] = useLoader(THREE.TextureLoader, [frontUrl, backUrl], (loader) => {
    loader.setCrossOrigin("anonymous")
  })

  // Texture settings applied post-load — mutating during render would violate
  // React's purity rules under the React Compiler.
  useEffect(() => {
    for (const tex of [frontTex, backTex]) {
      tex.colorSpace = THREE.SRGBColorSpace
      tex.anisotropy = 8
      tex.needsUpdate = true
    }
  }, [frontTex, backTex])

  // MTG card aspect ratio 2.5:3.5 inches
  const w = 2.4
  const h = 3.36
  const d = 0.05 // ~0.6mm at this scale — thick enough to look like cardstock at 90°

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * speed
    }
  })

  return (
    <mesh ref={meshRef} rotation={[0, initialRotationY, 0]} castShadow>
      <boxGeometry args={[w, h, d]} />
      {/* BoxGeometry material order: +x, -x, +y, -y, +z (front), -z (back) */}
      <meshStandardMaterial attach="material-0" color="#1a0f08" roughness={0.9} metalness={0.05} />
      <meshStandardMaterial attach="material-1" color="#1a0f08" roughness={0.9} metalness={0.05} />
      <meshStandardMaterial attach="material-2" color="#1a0f08" roughness={0.9} metalness={0.05} />
      <meshStandardMaterial attach="material-3" color="#1a0f08" roughness={0.9} metalness={0.05} />
      <meshStandardMaterial attach="material-4" map={frontTex} roughness={0.45} metalness={0.15} />
      <meshStandardMaterial attach="material-5" map={backTex} roughness={0.45} metalness={0.15} />
    </mesh>
  )
}

interface RotatingCardProps {
  frontUrl: string
  backUrl: string
  className?: string
  speed?: number
}

export function RotatingCard({ frontUrl, backUrl, className, speed = 0.35 }: RotatingCardProps) {
  return (
    <div className={className} style={{ width: "100%", height: "100%" }}>
      <Canvas
        camera={{ position: [0, 0, 6.5], fov: 30 }}
        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: false }}
        dpr={[1, 2]}
        style={{ background: "transparent" }}
      >
        {/* Soft ambient + one warm key light + cool rim light */}
        <ambientLight intensity={0.55} />
        <directionalLight position={[3, 2, 4]} intensity={1.2} color="#fff2dc" />
        <directionalLight position={[-3, -1, -2]} intensity={0.35} color="#a8b4d4" />
        <Suspense fallback={null}>
          <CardMesh frontUrl={frontUrl} backUrl={backUrl} speed={speed} />
        </Suspense>
      </Canvas>
    </div>
  )
}

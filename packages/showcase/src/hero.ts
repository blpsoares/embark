import * as THREE from "three";

export function initHero() {
  const canvas = document.getElementById("hero-canvas") as HTMLCanvasElement | null;
  if (!canvas) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Particles
  const particleCount = 1500;
  const positions = new Float32Array(particleCount * 3);
  const velocities = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 20;
    positions[i + 1] = (Math.random() - 0.5) * 20;
    positions[i + 2] = (Math.random() - 0.5) * 20;

    velocities[i] = (Math.random() - 0.5) * 0.005;
    velocities[i + 1] = (Math.random() - 0.5) * 0.005;
    velocities[i + 2] = (Math.random() - 0.5) * 0.005;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0x818cf8,
    size: 0.035,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
  });

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);

  // Wireframe geometries
  const wireframeMaterial = new THREE.MeshBasicMaterial({
    color: 0x22d3ee,
    wireframe: true,
    transparent: true,
    opacity: 0.08,
  });

  const icosahedron = new THREE.Mesh(
    new THREE.IcosahedronGeometry(3, 1),
    wireframeMaterial
  );
  icosahedron.position.set(5, 2, -5);
  scene.add(icosahedron);

  const torus = new THREE.Mesh(
    new THREE.TorusGeometry(2, 0.5, 8, 16),
    wireframeMaterial.clone()
  );
  torus.material.color = new THREE.Color(0xa78bfa);
  torus.position.set(-6, -2, -4);
  scene.add(torus);

  camera.position.z = 8;

  // Mouse tracking
  const mouse = { x: 0, y: 0 };

  window.addEventListener("mousemove", (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  function animate() {
    requestAnimationFrame(animate);

    // Rotate particles
    particles.rotation.y += 0.0005;
    particles.rotation.x += 0.0002;

    // Mouse influence
    particles.rotation.y += mouse.x * 0.0008;
    particles.rotation.x += mouse.y * 0.0008;

    // Animate wireframes
    icosahedron.rotation.x += 0.003;
    icosahedron.rotation.y += 0.002;

    torus.rotation.x += 0.002;
    torus.rotation.z += 0.003;

    // Move particles
    const posArray = geometry.attributes.position!.array as Float32Array;
    for (let i = 0; i < particleCount * 3; i += 3) {
      posArray[i]! += velocities[i]!;
      posArray[i + 1]! += velocities[i + 1]!;
      posArray[i + 2]! += velocities[i + 2]!;

      // Boundaries
      if (Math.abs(posArray[i]!) > 10) velocities[i]! *= -1;
      if (Math.abs(posArray[i + 1]!) > 10) velocities[i + 1]! *= -1;
      if (Math.abs(posArray[i + 2]!) > 10) velocities[i + 2]! *= -1;
    }
    geometry.attributes.position!.needsUpdate = true;

    renderer.render(scene, camera);
  }

  animate();
}

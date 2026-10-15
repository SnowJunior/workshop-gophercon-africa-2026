// Weather occupies the space around each card, with real depth and lighting.
// The CSS scene underneath is the fallback when WebGL is unavailable.
import { mount } from '/assets/js/threejs.js';

mount('weather', ({ THREE, scene, camera, canvas, still, invalidate }) => {
	const side = canvas.dataset.weatherSide;
	const slot = canvas.closest('[data-slot]');
	camera.position.set(0, 0, 10);
	const atmosphere = new THREE.Group();
	scene.add(atmosphere);
	scene.add(new THREE.HemisphereLight(0xdceeff, 0x30345c, 2.8));
	const light = new THREE.DirectionalLight(0xffffff, 3.5);
	light.position.set(-3, 6, 5);
	scene.add(light);

	const cloudMaterial = new THREE.MeshStandardMaterial({ color: 0xd3e2f5, roughness: 0.95 });
	const sphere = new THREE.SphereGeometry(1, 24, 16);
	const clouds = new THREE.Group();
	// Overlapping lit volumes produce rounded clouds rather than flat blurs.
	for (let c = 0; c < 3; c++) {
		const cloud = new THREE.Group();
		for (let i = 0; i < 5; i++) {
			const puff = new THREE.Mesh(sphere, cloudMaterial);
			puff.position.set((i - 2) * 0.42, Math.sin(i * 2.1) * 0.18, Math.cos(i * 1.4) * 0.25);
			puff.scale.set(0.65, 0.32 + (i % 3) * 0.12, 0.42);
			cloud.add(puff);
		}
		cloud.position.set((c - 1) * 0.95, 3.1 - c * 0.3, -0.5 + c * 0.45);
		cloud.scale.setScalar(c === 1 ? 0.85 : 0.6);
		cloud.userData.x = cloud.position.x;
		clouds.add(cloud);
	}
	atmosphere.add(clouds);

	const sun = new THREE.Group();
	const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffce65 });
	const orb = new THREE.Mesh(sphere, sunMaterial);
	orb.scale.setScalar(0.64);
	sun.add(orb);
	const rays = new THREE.Group();
	for (let i = 0; i < 12; i++) {
		const ray = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.24, 4, 8), sunMaterial);
		const angle = i * Math.PI / 6;
		ray.position.set(Math.sin(angle) * 1.03, Math.cos(angle) * 1.03, 0);
		ray.rotation.z = -angle;
		rays.add(ray);
	}
	sun.add(rays);
	sun.position.set(0.7, 2.8, 0);
	atmosphere.add(sun);

	// Particles are spread through a volume: nearby flakes are visibly larger.
	const count = 210;
	const positions = new Float32Array(count * 3);
	const seeds = Array.from({ length: count }, (_, i) => ({
		x: Math.sin(i * 127.1) * 3.3,
		y: ((i * 0.61803398875) % 1) * 9 - 4.5,
		z: Math.sin(i * 73.7) * 1.8,
	}));
	seeds.forEach((s, i) => positions.set([s.x, s.y, s.z], i * 3));
	const particleGeo = new THREE.BufferGeometry();
	particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
	const particleMat = new THREE.ShaderMaterial({
		uniforms: { tint: { value: new THREE.Color(0xffffff) }, size: { value: 55 } },
		vertexShader: 'uniform float size; void main(){ vec4 p=modelViewMatrix*vec4(position,1.0); gl_PointSize=size/-p.z; gl_Position=projectionMatrix*p; }',
		fragmentShader: 'uniform vec3 tint; void main(){ float d=length(gl_PointCoord-0.5); float a=1.0-smoothstep(0.15,0.5,d); gl_FragColor=vec4(tint,a*0.85); }',
		transparent: true, depthWrite: false,
	});
	const particles = new THREE.Points(particleGeo, particleMat);
	atmosphere.add(particles);

	const rainPositions = new Float32Array(count * 6);
	const rainGeo = new THREE.BufferGeometry();
	rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
	const rainMat = new THREE.LineBasicMaterial({ color: 0x9bcfff, transparent: true, opacity: 0.6, depthWrite: false });
	const rain = new THREE.LineSegments(rainGeo, rainMat);
	atmosphere.add(rain);

	const mistMaterial = new THREE.MeshBasicMaterial({ color: 0xc8d9ea, transparent: true, opacity: 0.08, depthWrite: false });
	const mist = new THREE.Group();
	for (let i = 0; i < 6; i++) {
		const bank = new THREE.Mesh(sphere, mistMaterial);
		bank.scale.set(3.7, 0.4, 0.6);
		bank.position.set(Math.sin(i) * 0.8, 3.2 - i * 1.3, (i % 3) - 1);
		mist.add(bank);
	}
	atmosphere.add(mist);

	const bolt = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
		new THREE.Vector3(0.3, 2.7, 1), new THREE.Vector3(-0.15, 1.9, 1),
		new THREE.Vector3(0.3, 2, 1), new THREE.Vector3(-0.3, 1.05, 1),
	]), new THREE.LineBasicMaterial({ color: 0xe5eaff, transparent: true }));
	atmosphere.add(bolt);

	let sky;
	function setWeather(next) {
		sky = next || 'none';
		atmosphere.visible = sky !== 'none';
		clouds.visible = ['cloudy', 'rain', 'drizzle', 'snow', 'storm'].includes(sky);
		cloudMaterial.color.set(sky === 'storm' ? 0x596781 : 0xd3e2f5);
		sun.visible = sky === 'clear' || sky === 'cloudy';
		sun.position.x = sky === 'clear' ? 0 : 1;
		particles.visible = sky === 'snow' || sky === 'dust';
		particleMat.uniforms.tint.value.set(sky === 'dust' ? 0xe5b779 : 0xffffff);
		particleMat.uniforms.size.value = sky === 'dust' ? 25 : 55;
		rain.visible = ['rain', 'drizzle', 'storm'].includes(sky);
		rainGeo.setDrawRange(0, sky === 'drizzle' ? 120 : count * 2);
		mist.visible = sky === 'fog' || sky === 'dust';
		mistMaterial.color.set(sky === 'dust' ? 0xc4a176 : 0xc8d9ea);
		bolt.visible = sky === 'storm';
		invalidate();
	}
	document.addEventListener('faceoff:change', (e) => setWeather(e.detail.skies[side]));
	setWeather(slot.dataset.sky);

	return (time, delta) => {
		if (!atmosphere.visible || !canvas.closest('[data-globe]').classList.contains('is-detail')) return;
		const t = still ? 0 : time;
		clouds.children.forEach((cloud, i) => {
			cloud.position.x = cloud.userData.x + Math.sin(t * 0.22 + i) * 0.25;
			cloud.rotation.y = Math.sin(t * 0.15 + i) * 0.12;
		});
		rays.rotation.z = t * 0.07;
		sun.scale.setScalar(1 + Math.sin(t * 0.8) * 0.035);
		mist.position.x = Math.sin(t * 0.18) * 0.4;
		// A single soft lightning glow, with no rapid strobing.
		bolt.material.opacity = still ? 0.65 : Math.pow(Math.max(0, Math.sin(t * 0.65)), 12);
		if (!particles.visible && !rain.visible) return;
		const dt = still ? 0 : Math.min(delta || 0, 0.05);
		for (let i = 0; i < count; i++) {
			const at = i * 3;
			positions[at + 1] -= dt * (rain.visible ? (sky === 'storm' ? 7 : 4.5) : 0.6);
			if (positions[at + 1] < -4.5) positions[at + 1] = 4.5;
			positions[at] = seeds[i].x + Math.sin(t * 0.45 + i) * (sky === 'dust' ? 1.3 : 0.2);
			const r = i * 6;
			rainPositions.set([positions[at], positions[at + 1], positions[at + 2], positions[at] - 0.045, positions[at + 1] + 0.22, positions[at + 2]], r);
		}
		particleGeo.attributes.position.needsUpdate = true;
		rainGeo.attributes.position.needsUpdate = true;
	};
});

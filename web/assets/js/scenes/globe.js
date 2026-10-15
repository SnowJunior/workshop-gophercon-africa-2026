// The globe: dotted continents, a hotspot wherever animals were seen, and
// an arc between the two sightings in the face-off. It talks to faceoff.js
// through events on document: it sends globe:pick, and listens for
// faceoff:change and globe:focus.

import { mount } from '/assets/js/threejs.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const LAND = 'https://cdn.jsdelivr.net/npm/three-globe@2.31.0/example/img/earth-water.png';
const R = 1;

function read() {
	try {
		return JSON.parse(document.getElementById('globe-data').textContent) || { spots: [], sightings: [] };
	} catch (err) {
		return { spots: [], sightings: [] };
	}
}

mount('globe', function ({ THREE, scene, camera, canvas, colour, still, invalidate }) {
	let clock = 0;
	let idleSince = 0;
	const data = read();
	const spots = data.spots || [];
	const tip = document.querySelector('[data-globe-tip]');

	const toVec = (lat, lng, r = R) => {
		const la = (lat * Math.PI) / 180;
		const ln = (lng * Math.PI) / 180;
		return new THREE.Vector3(r * Math.cos(la) * Math.sin(ln), r * Math.sin(la), r * Math.cos(la) * Math.cos(ln));
	};

	camera.position.set(0, 0.6, 3.1);
	const controls = new OrbitControls(camera, canvas);
	controls.enableZoom = false;
	controls.enablePan = false;
	controls.enableDamping = !still;
	controls.rotateSpeed = 0.55;
	controls.autoRotate = !still;
	controls.autoRotateSpeed = 0.8;
	let paused = still;
	let inspecting = false;
	let dragging = false;
	const rotation = document.querySelector('[data-rotation]');
	function rotationLabel() {
		rotation.textContent = paused ? 'Resume rotation' : 'Pause rotation';
		rotation.setAttribute('aria-pressed', String(paused));
	}
	rotationLabel();
	if (still) {
		rotation.textContent = 'Reduced motion enabled';
		rotation.disabled = true;
	}
	rotation.addEventListener('click', () => {
		paused = !paused;
		controls.autoRotate = !paused && !inspecting;
		rotationLabel();
	});
	controls.addEventListener('change', invalidate);
	document.addEventListener('globe:view', (e) => {
		inspecting = e.detail.details;
		controls.enabled = !inspecting;
		controls.autoRotate = !still && !paused && !inspecting;
		if (!inspecting) target = null;
		if (tip) tip.hidden = true;
		invalidate();
	});

	// The sea, and a grid of latitudes and longitudes that shows even if the land map can't load.
	scene.add(new THREE.Mesh(
		new THREE.SphereGeometry(R * 0.995, 64, 64),
		new THREE.MeshBasicMaterial({ color: colour('--globe-sea', '#120e33') }),
	));

	const grid = [];
	for (let lat = -60; lat <= 60; lat += 30) {
		for (let lng = 0; lng < 360; lng += 4) grid.push(toVec(lat, lng, R * 1.001), toVec(lat, lng + 4, R * 1.001));
	}
	for (let lng = 0; lng < 360; lng += 30) {
		for (let lat = -88; lat < 88; lat += 4) grid.push(toVec(lat, lng, R * 1.001), toVec(lat + 4, lng, R * 1.001));
	}
	scene.add(new THREE.LineSegments(
		new THREE.BufferGeometry().setFromPoints(grid),
		new THREE.LineBasicMaterial({ color: colour('--globe-grid', '#2a2570'), transparent: true, opacity: 0.55 }),
	));

	// A soft halo around the edge.
	scene.add(new THREE.Mesh(
		new THREE.SphereGeometry(R * 1.16, 64, 64),
		new THREE.ShaderMaterial({
			uniforms: { glow: { value: colour('--globe-glow', '#1789f0') } },
			vertexShader: 'varying vec3 n; void main() { n = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
			fragmentShader: 'uniform vec3 glow; varying vec3 n; void main() { float i = pow(0.72 - dot(n, vec3(0.0, 0.0, 1.0)), 2.4); gl_FragColor = vec4(glow, 1.0) * i; }',
			side: THREE.BackSide,
			blending: THREE.AdditiveBlending,
			transparent: true,
			depthWrite: false,
		}),
	));

	// Round dots, drawn once on a small canvas.
	const dot = (() => {
		const c = document.createElement('canvas');
		c.width = c.height = 32;
		const g = c.getContext('2d');
		g.fillStyle = '#fff';
		g.beginPath();
		g.arc(16, 16, 14, 0, Math.PI * 2);
		g.fill();
		return new THREE.CanvasTexture(c);
	})();

	// Continents as dots, sampled from a land-and-sea map.
	const img = new Image();
	img.crossOrigin = 'anonymous';
	img.onload = function () {
		const w = 720;
		const h = 360;
		const c = document.createElement('canvas');
		c.width = w;
		c.height = h;
		const g = c.getContext('2d', { willReadFrequently: true });
		g.drawImage(img, 0, 0, w, h);
		const px = g.getImageData(0, 0, w, h).data;
		const positions = [];
		const N = 16000;
		const golden = Math.PI * (3 - Math.sqrt(5));
		for (let i = 0; i < N; i++) {
			const y = 1 - (i / (N - 1)) * 2;
			const lat = (Math.asin(y) * 180) / Math.PI;
			const lng = ((((i * golden * 180) / Math.PI) % 360) + 360) % 360 - 180;
			const u = Math.min(w - 1, Math.floor(((lng + 180) / 360) * w));
			const v = Math.min(h - 1, Math.floor(((90 - lat) / 180) * h));
			if (px[(v * w + u) * 4] < 128) {
				const p = toVec(lat, lng, R * 1.003);
				positions.push(p.x, p.y, p.z);
			}
		}
		const geo = new THREE.BufferGeometry();
		geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
		scene.add(new THREE.Points(geo, new THREE.PointsMaterial({
			color: colour('--globe-land', '#3f7fe0'),
			size: 0.022,
			map: dot,
			transparent: true,
			alphaTest: 0.4,
			depthWrite: false,
		})));
		invalidate();
	};
	img.src = LAND;

	// Hotspots: a dot and a pulsing ring each, bigger where there are more sightings.
	const hot = colour('--poppy', '#ff2a1f');
	const hits = [];
	const rings = [];
	spots.forEach(function (spot, i) {
		const size = 0.016 + Math.min(0.03, Math.sqrt(spot.items.length) * 0.008);
		const pos = toVec(spot.lat, spot.lng, R * 1.008);

		const core = new THREE.Mesh(new THREE.SphereGeometry(size, 16, 16), new THREE.MeshBasicMaterial({ color: hot }));
		core.position.copy(pos);
		scene.add(core);

		const ring = new THREE.Mesh(
			new THREE.RingGeometry(size * 1.3, size * 1.8, 32),
			new THREE.MeshBasicMaterial({ color: hot, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }),
		);
		ring.position.copy(pos);
		ring.lookAt(pos.clone().multiplyScalar(2));
		ring.userData.phase = (i * 0.37) % 1;
		scene.add(ring);
		rings.push(ring);

		const hit = new THREE.Mesh(new THREE.SphereGeometry(Math.max(size * 2.6, 0.06), 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
		hit.position.copy(pos);
		hit.userData.spot = i;
		scene.add(hit);
		hits.push(hit);
	});

	// The two picks: a beacon each, gold for A and sky blue for B, and an arc between them.
	function beacon(css, fallback) {
		const c = colour(css, fallback);
		const group = new THREE.Group();
		const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.22, 8), new THREE.MeshBasicMaterial({ color: c }));
		stem.position.y = 0.11;
		const head = new THREE.Mesh(new THREE.SphereGeometry(0.026, 16, 16), new THREE.MeshBasicMaterial({ color: c }));
		head.position.y = 0.23;
		const halo = new THREE.Mesh(
			new THREE.RingGeometry(0.03, 0.05, 32),
			new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }),
		);
		halo.rotation.x = -Math.PI / 2;
		group.add(stem, head, halo);
		group.visible = false;
		group.userData.halo = halo;
		scene.add(group);
		return group;
	}
	const beacons = { a: beacon('--faceoff-a', '#f5b82e'), b: beacon('--faceoff-b', '#5cc8ff') };

	function place(group, at) {
		group.visible = !!at;
		if (!at) return;
		const pos = toVec(at.lat, at.lng, R * 1.004);
		group.position.copy(pos);
		group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pos.clone().normalize());
		group.userData.born = clock;
	}

	const arcMat = new THREE.LineDashedMaterial({ color: colour('--faceoff-a', '#f5b82e'), dashSize: 0.05, gapSize: 0.03, transparent: true, opacity: 0.95 });
	let arc = null;
	const runner = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 12), new THREE.MeshBasicMaterial({ color: colour('--chalk', '#ffffff') }));
	runner.visible = false;
	scene.add(runner);
	let arcPoints = [];

	function drawArc(a, b) {
		if (arc) {
			scene.remove(arc);
			arc.geometry.dispose();
			arc = null;
		}
		runner.visible = false;
		arcPoints = [];
		if (!a || !b) return;
		const va = toVec(a.lat, a.lng).normalize();
		const vb = toVec(b.lat, b.lng).normalize();
		const angle = va.angleTo(vb);
		const lift = 0.12 + 0.45 * (angle / Math.PI);
		for (let i = 0; i <= 96; i++) {
			const t = i / 96;
			const p = new THREE.Vector3().copy(va).lerp(vb, t).normalize();
			if (angle > 3.1) p.copy(va).applyAxisAngle(new THREE.Vector3(0, 1, 0), angle * t);
			arcPoints.push(p.multiplyScalar(R * (1.01 + lift * Math.sin(Math.PI * t))));
		}
		arc = new THREE.Line(new THREE.BufferGeometry().setFromPoints(arcPoints), arcMat);
		arc.computeLineDistances();
		scene.add(arc);
		runner.visible = !still;
	}

	// Turning the camera to face a place.
	let target = null;
	function focus(lat, lng) {
		target = toVec(lat, lng).normalize().multiplyScalar(camera.position.length());
		controls.autoRotate = false;
		idleSince = clock;
		if (still) { camera.position.copy(target); target = null; controls.update(); }
		invalidate();
	}

	// Hover shows the place; a click that wasn't a drag picks it.
	const raycaster = new THREE.Raycaster();
	const ndc = new THREE.Vector2();
	const globeBall = new THREE.Sphere(new THREE.Vector3(), R);

	function spotAt(e) {
		const rect = canvas.getBoundingClientRect();
		ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
		raycaster.setFromCamera(ndc, camera);
		const hit = raycaster.intersectObjects(hits)[0];
		if (!hit) return null;
		const front = raycaster.ray.intersectSphere(globeBall, new THREE.Vector3());
		if (front && camera.position.distanceTo(front) + 0.02 < hit.distance - 0.06) return null;
		return { spot: hit.object.userData.spot, rect };
	}

	canvas.addEventListener('pointermove', function (e) {
		const found = spotAt(e);
		canvas.style.cursor = found ? 'pointer' : 'grab';
		if (!tip) return;
		if (!found) {
			tip.hidden = true;
			return;
		}
		const spot = spots[found.spot];
		const n = spot.items.length;
		tip.textContent = spot.label + ' · ' + n + (n === 1 ? ' sighting' : ' sightings');
		tip.style.left = e.clientX - found.rect.left + 'px';
		tip.style.top = e.clientY - found.rect.top + 'px';
		tip.hidden = false;
	});
	canvas.addEventListener('pointerleave', function () {
		if (tip) tip.hidden = true;
	});

	let down = null;
	canvas.addEventListener('pointerdown', function (e) {
		down = { x: e.clientX, y: e.clientY };
		dragging = true;
		controls.autoRotate = false;
		target = null;
		idleSince = clock;
		if (still) { camera.position.copy(target); target = null; controls.update(); }
		invalidate();
	});
	canvas.addEventListener('pointerup', function (e) {
		const start = down;
		down = null;
		dragging = false;
		idleSince = clock;
		if (!start || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) return;
		const found = spotAt(e);
		if (found) document.dispatchEvent(new CustomEvent('globe:pick', { detail: { spot: found.spot } }));
	});

	canvas.addEventListener('pointercancel', () => { down = null; dragging = false; idleSince = clock; });

	document.addEventListener('globe:focus', function (e) {
		const spot = spots[e.detail.spot];
		if (spot) focus(spot.lat, spot.lng);
	});

	document.addEventListener('faceoff:change', function (e) {
		const { a, b, latest } = e.detail;
		place(beacons.a, a);
		place(beacons.b, b);
		drawArc(a, b);
		if (a && b) {
			const mid = toVec(a.lat, a.lng).add(toVec(b.lat, b.lng));
			if (mid.lengthSq() > 0.01) {
				target = mid.normalize().multiplyScalar(camera.position.length());
				controls.autoRotate = false;
				idleSince = clock;
			}
		} else if (latest) {
			focus(latest.lat, latest.lng);
		}
		if (still && target) { camera.position.copy(target); target = null; controls.update(); }
		invalidate();
	});

	return function (time, delta) {
		clock = time;

		if (target) {
			const len = camera.position.length();
			camera.position.lerp(target, 0.06).setLength(len);
			if (camera.position.distanceTo(target) < 0.01) target = null;
		}
		if (!still && !paused && !inspecting && !dragging && !controls.autoRotate && !target && clock - idleSince > 3) {
			controls.autoRotate = true;
		}
		controls.update(delta);

		rings.forEach(function (ring) {
			const t = (time * 0.6 + ring.userData.phase) % 1;
			ring.scale.setScalar(1 + t * 1.6);
			ring.material.opacity = 0.85 * (1 - t);
		});

		['a', 'b'].forEach(function (k) {
			const halo = beacons[k].userData.halo;
			const t = (time * 0.9) % 1;
			halo.scale.setScalar(1 + t * 2);
			halo.material.opacity = 0.9 * (1 - t);
		});

		if (arc) {
			if (runner.visible && arcPoints.length) {
				const t = (time * 0.35) % 1;
				runner.position.copy(arcPoints[Math.floor(t * (arcPoints.length - 1))]);
			}
		}
	};
});

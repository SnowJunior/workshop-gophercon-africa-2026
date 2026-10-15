// The face-off: pick two places on the globe and their sightings meet side
// by side, each card in the weather it was seen in, with mirrored bars and
// how far apart they were in kilometres and time. Every field is GBIF's, so
// cards are built with textContent, never innerHTML.

(function () {
	const root = document.querySelector('[data-faceoff]');
	const source = document.getElementById('globe-data');
	const template = document.getElementById('faceoff-card');
	if (!root || !source || !template) return;

	let data;
	try {
		data = JSON.parse(source.textContent);
	} catch (err) {
		return;
	}
	const sightings = data.sightings || [];
	const spots = data.spots || [];
	const spotOf = new Map();
	spots.forEach((spot, s) => spot.items.forEach((i) => spotOf.set(i, s)));

	const slots = { a: root.querySelector('[data-slot="a"]'), b: root.querySelector('[data-slot="b"]') };
	const contents = { a: slots.a.querySelector('[data-slot-content]'), b: slots.b.querySelector('[data-slot-content]') };
	const empties = { a: contents.a.firstElementChild.cloneNode(true), b: contents.b.firstElementChild.cloneNode(true) };
	const explorer = document.querySelector('[data-globe]');
	const status = explorer.querySelector('[data-explorer-status]');
	const showCards = explorer.querySelector('[data-show-cards]');
	const choose = explorer.querySelector('[data-choose]');
	const rotation = explorer.querySelector('[data-rotation]');
	const stage = explorer.querySelector('.globe__stage');
	const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	let focusTimer;
	function view(details, moveFocus = false) {
		clearTimeout(focusTimer);
		explorer.classList.toggle('is-detail', details);
		root.inert = !details;
		stage.inert = details;
		choose.hidden = !details;
		rotation.hidden = details;
		showCards.hidden = details || (state.a === null && state.b === null);
		status.textContent = details
			? 'Weather at the time of each sighting. Choose another place to compare.'
			: 'Pick a glowing point, or choose a place from the list below.';
		document.dispatchEvent(new CustomEvent('globe:view', { detail: { details } }));
		if (moveFocus) {
			// Focus once the reveal finishes; newly visible content cannot be
			// focused reliably during the first frame in every browser.
			focusTimer = setTimeout(() => {
				if (explorer.classList.contains('is-detail') !== details) return;
				const focus = details ? root.querySelector('.wxcard__name')
					: rotation.disabled ? document.querySelector('.places summary') : rotation;
				if (focus) focus.focus({ preventScroll: true });
			}, details && !still ? 700 : 0);
			explorer.scrollIntoView({ behavior: still ? 'instant' : 'smooth', block: 'start' });
		}
	}

	const gap = root.querySelector('[data-gap]');
	const bars = root.querySelector('[data-bars]');
	const actions = root.querySelector('[data-actions]');
	const intro = gap.textContent;
	const state = { a: null, b: null };

	const SKY = {
		clear: 'clear skies', cloudy: 'clouds', rain: 'rain', drizzle: 'drizzle', snow: 'snow',
		storm: 'a storm', fog: 'fog', dust: 'dust', none: 'unrecorded weather',
	};

	const METRICS = [
		{ label: 'Temperature', get: (s) => s.temp, unit: ' °C' },
		{ label: 'Feels like', get: (s) => s.feels, unit: ' °C' },
		{ label: 'Wind', get: (s) => s.wind, unit: ' km/h' },
		{ label: 'Humidity', get: (s) => s.humidity, unit: '%' },
		{ label: 'Counted', get: (s) => s.count, unit: '' },
		{ label: 'Height above sea', get: (s) => s.elev, unit: ' m' },
		{ label: 'From the equator', get: (s) => Math.abs(s.lat), unit: '°' },
	];

	const safeURL = (u) => /^https?:\/\//i.test(u || '') ? u : '';
	const num = (v) => typeof v === 'number' && isFinite(v);

	function card(i, side) {
		const s = sightings[i];
		const node = template.content.firstElementChild.cloneNode(true);
		node.classList.add('wxcard--' + (s.sky || 'none'), 'wxcard--' + side, 'is-new');

		const img = node.querySelector('.wxcard__photo img');
		const photo = safeURL(s.photo);
		if (photo) {
			img.src = photo;
			img.alt = s.name;
		} else {
			node.querySelector('.wxcard__photo').remove();
			node.classList.add('wxcard--no-photo');
		}

		node.querySelector('.wxcard__tag').textContent = side.toUpperCase();
		node.querySelector('.wxcard__name').textContent = s.name;
		const sci = node.querySelector('.wxcard__sci');
		if (s.sci) sci.textContent = s.sci;
		else sci.remove();
		node.querySelector('.wxcard__place').textContent = s.place + ' · ' + s.date;

		node.querySelector('.wxcard__weather use').setAttribute('href', '#wx-' + (s.sky === 'none' ? 'cloudy' : s.sky));
		node.querySelector('.wxcard__temp').textContent = num(s.temp) ? Math.round(s.temp) + ' °C' : '';
		node.querySelector('.wxcard__wx').textContent = s.wx || 'No weather recorded';

		const by = node.querySelector('.wxcard__by');
		if (s.by) by.textContent = 'Recorded by ' + s.by;
		else by.remove();

		const link = node.querySelector('.wxcard__link');
		link.href = s.url;
		link.setAttribute('aria-label', 'Open the ' + s.name + ' sighting');

		// Other animals seen at the same place, to swap in on this side.
		const others = node.querySelector('.wxcard__others');
		const spot = spots[spotOf.get(i)];
		const rest = spot ? spot.items.filter((j) => j !== i).slice(0, 5) : [];
		if (rest.length) {
			const label = document.createElement('span');
			label.textContent = 'Also here:';
			others.appendChild(label);
			rest.forEach((j) => {
				const chip = document.createElement('button');
				chip.type = 'button';
				chip.className = 'wxcard__chip';
				chip.textContent = sightings[j].name;
				chip.addEventListener('click', () => {
					state[side] = j;
					render(side);
					requestAnimationFrame(() => contents[side].querySelector('.wxcard__name').focus({ preventScroll: true }));
				});
				others.appendChild(chip);
			});
		} else {
			others.remove();
		}
		return node;
	}

	function km(a, b) {
		const rad = Math.PI / 180;
		const dLat = (b.lat - a.lat) * rad;
		const dLng = (b.lng - a.lng) * rad;
		const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
		return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)));
	}

	function apart(a, b) {
		const days = Math.round(Math.abs(new Date(a.day) - new Date(b.day)) / 86400000);
		if (days === 0) return 'seen on the same day';
		const years = Math.floor(days / 365);
		const months = Math.floor((days % 365) / 30);
		const parts = [];
		if (years) parts.push(years + (years === 1 ? ' year' : ' years'));
		if (months) parts.push(months + (months === 1 ? ' month' : ' months'));
		if (!parts.length) parts.push(days + (days === 1 ? ' day' : ' days'));
		return parts.join(', ') + ' between them';
	}

	function compare(a, b) {
		bars.replaceChildren();
		METRICS.forEach((m) => {
			const va = m.get(a);
			const vb = m.get(b);
			if (!num(va) && !num(vb)) return;
			const lo = Math.min(0, num(va) ? va : 0, num(vb) ? vb : 0);
			const hi = Math.max(num(va) ? va : 0, num(vb) ? vb : 0, lo + 1);
			const row = document.createElement('div');
			row.className = 'bar';
			const label = document.createElement('dt');
			label.textContent = m.label;

			const side = (v, other, cls) => {
				const dd = document.createElement('dd');
				dd.className = 'bar__side ' + cls;
				const value = document.createElement('span');
				value.className = 'bar__value';
				value.textContent = num(v) ? Math.round(v).toLocaleString() + m.unit : '—';
				const track = document.createElement('span');
				track.className = 'bar__track';
				const fill = document.createElement('span');
				fill.className = 'bar__fill';
				fill.dataset.width = num(v) ? String(Math.max(4, ((v - lo) / (hi - lo)) * 100)) : '0';
				if (num(v) && (!num(other) || v > other)) dd.classList.add('is-more');
				track.appendChild(fill);
				dd.append(value, track);
				return dd;
			};

			row.append(side(va, vb, 'bar__side--a'), label, side(vb, va, 'bar__side--b'));
			bars.appendChild(row);
		});
		bars.hidden = !bars.children.length;
		requestAnimationFrame(() => requestAnimationFrame(() => {
			bars.querySelectorAll('.bar__fill').forEach((f) => { f.style.width = f.dataset.width + '%'; });
		}));
	}

	function render(changed) {
		['a', 'b'].forEach((side) => {
			if (changed && changed !== side && slots[side].querySelector('.wxcard')) return;
			const i = state[side];
			slots[side].dataset.sky = i === null ? 'none' : sightings[i].sky || 'none';
			slots[side].querySelector('.weather-space').className = 'weather-space wxcard--' + slots[side].dataset.sky;
			if (i === null) {
				contents[side].replaceChildren(empties[side].cloneNode(true));
				slots[side].classList.remove('is-filled');
			} else {
				contents[side].replaceChildren(card(i, side));
				slots[side].classList.add('is-filled');
			}
		});

		const a = state.a === null ? null : sightings[state.a];
		const b = state.b === null ? null : sightings[state.b];
		root.classList.toggle('is-ready', !!(a && b));
		actions.hidden = !(a || b);
		root.querySelector('[data-swap]').hidden = !(a && b);
		view(!!(a || b));
		document.querySelectorAll('[data-spot]').forEach((button) => {
			const selected = [state.a, state.b].some((i) => i !== null && spotOf.get(i) === Number(button.dataset.spot));
			button.setAttribute('aria-pressed', String(selected));
		});

		if (a && b) {
			const skies = a.sky === b.sky ? 'both in ' + SKY[a.sky] : SKY[a.sky] + ' vs ' + SKY[b.sky];
			gap.textContent = km(a, b).toLocaleString() + ' km apart · ' + apart(a, b) + ' · ' + skies;
			compare(a, b);
		} else {
			gap.textContent = a ? a.name + ' · ' + (a.wx || 'No weather recorded') + '. Choose another place to compare.' : intro;
			bars.hidden = true;
		}

		const latest = changed ? sightings[state[changed]] : null;
		document.dispatchEvent(new CustomEvent('faceoff:change', {
			detail: {
				a: a && { lat: a.lat, lng: a.lng },
				b: b && { lat: b.lat, lng: b.lng },
				latest: latest && { lat: latest.lat, lng: latest.lng },
				skies: { a: a && a.sky, b: b && b.sky },
			},
		}));
	}

	// A new pick fills A, then B; after that the older card makes way.
	function pick(spot) {
		const s = spots[spot];
		if (!s) return;
		const used = [state.a, state.b];
		const i = s.items.find((j) => !used.includes(j));
		if (i === undefined) {
			view(true, true);
			return;
		}
		if (state.a === null) {
			state.a = i;
			render('a');
		} else if (state.b === null) {
			state.b = i;
			render('b');
		} else {
			state.a = state.b;
			state.b = i;
			render();
		}
		view(true, true);
	}

	document.addEventListener('globe:pick', (e) => pick(e.detail.spot));

	document.querySelectorAll('[data-spot]').forEach((button) => {
		button.addEventListener('click', () => {
			const spot = Number(button.dataset.spot);
			document.dispatchEvent(new CustomEvent('globe:focus', { detail: { spot } }));
			pick(spot);
		});
	});

	explorer.addEventListener('click', (e) => {
		if (e.target.closest('[data-choose]')) view(false, true);
	});
	showCards.addEventListener('click', () => view(true, true));
	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape' && explorer.classList.contains('is-detail')) view(false, true);
	});

	root.querySelector('[data-swap]').addEventListener('click', () => {
		[state.a, state.b] = [state.b, state.a];
		render();
	});

	root.querySelector('[data-reset]').addEventListener('click', () => {
		state.a = state.b = null;
		render();
		view(false, true);
	});
})();

// The showcase slideshow, the menu, the search box and the tiles arriving as you scroll.

(function () {
	const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const AUTOPLAY = 3000;

	// Showcase: one sighting in the banner, the next three waiting as cards.
	function showcase(stage) {
		const slides = [...stage.querySelectorAll('[data-slide]')];
		const cards = [...stage.querySelectorAll('[data-card]')];
		const nums = [...stage.querySelectorAll('.stage__num')];
		const tiles = [...stage.querySelectorAll('.stage__pattern .tile')];
		const pause = stage.querySelector('[data-pause]');
		const turns = tiles.map(() => 0);
		const n = slides.length;
		let current = 0;
		let timer = null;
		let paused = still;
		let hovering = false;

		stage.style.setProperty('--autoplay', AUTOPLAY + 'ms');

		// dir is 1 to slide up to the next photo, -1 to slide down to the previous.
		function go(to, dir) {
			to = (to + n) % n;
			if (to === current && slides[to].classList.contains('is-active')) return;
			stage.dataset.dir = (dir || (to > current ? 1 : -1)) > 0 ? 'next' : 'back';
			const leaving = slides[current];
			current = to;
			slides.forEach((s, i) => {
				const on = i === current;
				s.classList.toggle('is-active', on);
				s.classList.toggle('is-leaving', s === leaving && !on);
				s.inert = !on;
			});
			clearTimeout(leaving.leaveTimer);
			leaving.leaveTimer = setTimeout(() => leaving.classList.remove('is-leaving'), 900);
			cards.forEach((c, i) => {
				c.dataset.pos = String((i - current + n) % n);
			});
			nums.forEach((b, i) => {
				const on = i === current;
				b.classList.toggle('is-active', on);
				if (on) b.setAttribute('aria-current', 'true');
				else b.removeAttribute('aria-current');
			});
			shuffle();
			restart();
		}

		// A few squares of the pattern turn each time the slide changes.
		function shuffle() {
			if (still) return;
			for (let k = 0; k < 7; k++) {
				const i = Math.floor(Math.random() * tiles.length);
				turns[i] += Math.random() < 0.5 ? 90 : -90;
				tiles[i].style.transform = 'rotate(' + turns[i] + 'deg)';
			}
		}

		function restart() {
			clearTimeout(timer);
			const playing = !paused && !hovering && n > 1 && !document.hidden;
			stage.classList.remove('is-playing');
			if (!playing) return;
			void stage.offsetWidth; // restarts the progress line's animation
			stage.classList.add('is-playing');
			timer = setTimeout(() => go(current + 1, 1), AUTOPLAY);
		}

		stage.addEventListener('click', (e) => {
			const target = e.target.closest('[data-goto], [data-prev], [data-next]');
			if (!target) return;
			if ('goto' in target.dataset) go(Number(target.dataset.goto));
			else {
				const dir = 'prev' in target.dataset ? -1 : 1;
				go(current + dir, dir);
			}
		});

		stage.addEventListener('keydown', (e) => {
			if (e.target.matches('input')) return;
			if (e.key === 'ArrowLeft') go(current - 1, -1);
			if (e.key === 'ArrowRight') go(current + 1, 1);
		});

		stage.addEventListener('pointerenter', () => { hovering = true; restart(); });
		stage.addEventListener('pointerleave', () => { hovering = false; restart(); });
		stage.addEventListener('focusin', () => { hovering = true; restart(); });
		stage.addEventListener('focusout', (e) => {
			if (!stage.contains(e.relatedTarget)) { hovering = false; restart(); }
		});
		document.addEventListener('visibilitychange', restart);

		if (pause) {
			pause.setAttribute('aria-pressed', String(paused));
			pause.addEventListener('click', () => {
				paused = !paused;
				pause.setAttribute('aria-pressed', String(paused));
				pause.querySelector('span').textContent = paused ? 'Play the slideshow' : 'Pause the slideshow';
				restart();
			});
		}

		// Swipe on a phone.
		let startX = null;
		stage.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
		stage.addEventListener('touchend', (e) => {
			if (startX === null || e.target.closest('.stage__cards')) return;
			const dx = e.changedTouches[0].clientX - startX;
			if (Math.abs(dx) > 50) go(current + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
			startX = null;
		});

		slides.forEach((s, i) => { s.inert = i !== 0; });
		restart();
	}

	// The search box narrows the tiles as you type.
	function search() {
		const form = document.querySelector('[data-search-form]');
		const input = document.querySelector('[data-search]');
		const toggle = document.querySelector('[data-search-toggle]');
		const empty = document.querySelector('[data-search-empty]');
		const items = [...document.querySelectorAll('[data-tile]')].map((t) => ({ el: t.parentElement, text: t.dataset.search || '' }));
		if (!form || !input) return;

		toggle.addEventListener('click', () => {
			form.classList.toggle('is-open');
			if (form.classList.contains('is-open')) input.focus();
		});

		let jumped = false;
		input.addEventListener('input', () => {
			const q = input.value.trim().toLowerCase();
			let shown = 0;
			items.forEach(({ el, text }) => {
				const match = !q || text.includes(q);
				el.hidden = !match;
				if (match) shown++;
			});
			if (empty) empty.hidden = shown > 0;
			if (q && !jumped) {
				document.getElementById('sightings').scrollIntoView({ behavior: still ? 'auto' : 'smooth' });
				jumped = true;
			}
			if (!q) jumped = false;
		});

		form.addEventListener('submit', (e) => {
			e.preventDefault();
			document.getElementById('sightings').scrollIntoView();
		});
	}

	// Tiles rise into place as they scroll into view, and the counts tick up.
	function arrive() {
		const list = document.querySelector('.tiles');
		const counts = document.querySelectorAll('[data-count]');
		if (still || !('IntersectionObserver' in window)) return;

		if (list) {
			list.classList.add('is-animated');
			const seen = new IntersectionObserver((entries) => {
				let delay = 0;
				entries.forEach((entry) => {
					if (!entry.isIntersecting) return;
					entry.target.style.transitionDelay = delay + 'ms';
					delay = Math.min(delay + 70, 350);
					entry.target.classList.add('is-in');
					seen.unobserve(entry.target);
				});
			}, { rootMargin: '0px 0px -8% 0px' });
			list.querySelectorAll('.tile').forEach((t) => seen.observe(t));
		}

		const tick = new IntersectionObserver((entries) => {
			entries.forEach((entry) => {
				if (!entry.isIntersecting) return;
				tick.unobserve(entry.target);
				const end = Number(entry.target.dataset.count) || 0;
				const start = performance.now();
				const step = (now) => {
					const t = Math.min((now - start) / 1400, 1);
					entry.target.textContent = String(Math.round(end * (1 - Math.pow(1 - t, 3))));
					if (t < 1) requestAnimationFrame(step);
				};
				requestAnimationFrame(step);
			});
		});
		counts.forEach((c) => tick.observe(c));
	}

	// The photo you picked glides into place on the sighting's page. Only one
	// element may carry the name, so it's set on the clicked one alone.
	function morph() {
		const NAME = 'spot-photo';
		const clear = () => document.querySelectorAll('img').forEach((img) => { img.style.viewTransitionName = 'none'; });

		document.addEventListener('click', (e) => {
			const link = e.target.closest('[data-morph]');
			if (!link || e.metaKey || e.ctrlKey || e.shiftKey) return;
			const box = link.closest('.tile, .slide') || link;
			const img = box.querySelector('.tile__photo img, .slide__media img, .spot__thumb img');
			if (!img) return;
			clear();
			img.style.viewTransitionName = NAME;
		});

		window.addEventListener('pageshow', () => {
			document.querySelectorAll('img').forEach((img) => { img.style.viewTransitionName = ''; });
		});
	}

	// Back returns to the home page where you left it, when that's where you came from; Esc does the same.
	function back() {
		const link = document.querySelector('[data-back]');
		if (!link) return;
		const fromHome = (() => {
			try {
				const ref = new URL(document.referrer);
				return ref.origin === location.origin && ref.pathname === '/';
			} catch (err) {
				return false;
			}
		})();

		link.addEventListener('click', (e) => {
			if (fromHome && history.length > 1) {
				e.preventDefault();
				history.back();
			}
		});
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape' && !document.querySelector('dialog[open]')) link.click();
		});
	}

	document.querySelectorAll('[data-showcase]').forEach(showcase);
	back();
	morph();
	search();
	arrive();
})();

import * as THREE from 'three';

// 1. GESTION DU LOADER
window.addEventListener('load', () => {
    setTimeout(() => {
        const loader = document.getElementById('loader');
        if (loader) loader.classList.add('loader-up');
        AOS.init({ duration: 1000, once: true });
    }, 2000);
});

// 2. BACKGROUND ANIME
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const STAR_COUNT = prefersReducedMotion ? 1200 : (window.innerWidth < 900 ? 2200 : 4000);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#bg'), alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
camera.position.z = 50;

let qualityLevel = 'high';
let pixelRatioCap = 1.6;
let frameCounter = 0;
let fpsStartTs = performance.now();
let canAnimateRich = window.matchMedia('(min-width: 901px)').matches && !prefersReducedMotion;

const geometry = new THREE.BufferGeometry();
const vertices = [];
for (let i = 0; i < STAR_COUNT; i++) {
    vertices.push((Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200);
}
geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
const stars = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ color: 0xff2d75, size: 0.15, transparent: true, opacity: 0.8 })
);
scene.add(stars);

// Storytelling 3D object that evolves with active section
const storyGroup = new THREE.Group();
let storyCore = new THREE.Mesh(
    new THREE.TorusKnotGeometry(6, 1.6, 120, 20),
    new THREE.MeshBasicMaterial({ color: 0x00e5ff, wireframe: true, transparent: true, opacity: 0.25 })
);
const storyRing = new THREE.Mesh(
    new THREE.TorusGeometry(12, 0.16, 12, 120),
    new THREE.MeshBasicMaterial({ color: 0xff2d75, transparent: true, opacity: 0.28 })
);
storyGroup.add(storyCore);
storyGroup.add(storyRing);
storyGroup.position.set(18, -4, -28);
scene.add(storyGroup);

const createStoryGeometry = (shape) => {
    switch (shape) {
        case 'icosahedron':
            return new THREE.IcosahedronGeometry(6.2, 1);
        case 'octahedron':
            return new THREE.OctahedronGeometry(7, 1);
        case 'torus':
            return new THREE.TorusGeometry(7.5, 2.2, 24, 72);
        case 'dodecahedron':
            return new THREE.DodecahedronGeometry(6.4, 1);
        case 'sphere':
            return new THREE.SphereGeometry(6.6, 20, 20);
        case 'torusKnot':
        default:
            return new THREE.TorusKnotGeometry(6, 1.6, 120, 20);
    }
};

let currentStoryShape = 'torusKnot';
let pendingStoryShape = 'torusKnot';
let isMorphingStory = false;
let morphProgress = 0;
const morphSpeed = 2.8;

const setStoryGeometry = (shape) => {
    const nextGeometry = createStoryGeometry(shape);
    storyCore.geometry.dispose();
    storyCore.geometry = nextGeometry;
    currentStoryShape = shape;
};

const startStoryMorph = (shape) => {
    if (!shape || shape === currentStoryShape) return;
    pendingStoryShape = shape;
    isMorphingStory = true;
    morphProgress = 0;
};

const sectionColorMap = {
    home: '#ff2d75',
    about: '#ff4d8a',
    resume: '#ff6a5f',
    services: '#00e5ff',
    projects: '#73f5ff',
    contact: '#9f83ff'
};
const sectionStoryMap = {
    home: { x: 18, y: -4, z: -28, rx: 0.2, ry: 0.1, rz: 0.1, scale: 1.0, core: '#00e5ff', ring: '#ff2d75', shape: 'torusKnot' },
    about: { x: -18, y: 6, z: -34, rx: 0.5, ry: 1.0, rz: 0.2, scale: 1.1, core: '#73f5ff', ring: '#ff4d8a', shape: 'icosahedron' },
    resume: { x: 15, y: 4, z: -30, rx: 1.0, ry: 0.4, rz: 0.8, scale: 0.95, core: '#ff6a5f', ring: '#ffc857', shape: 'octahedron' },
    services: { x: -15, y: -6, z: -27, rx: 0.4, ry: 1.4, rz: 1.2, scale: 1.2, core: '#00e5ff', ring: '#32ff95', shape: 'torus' },
    projects: { x: 14, y: 6, z: -33, rx: 1.3, ry: 0.8, rz: 0.2, scale: 1.25, core: '#9f83ff', ring: '#73f5ff', shape: 'dodecahedron' },
    contact: { x: -12, y: 2, z: -25, rx: 0.2, ry: 1.8, rz: 0.6, scale: 1.0, core: '#ffffff', ring: '#00e5ff', shape: 'sphere' }
};
const targetStarColor = new THREE.Color(sectionColorMap.home);
const currentStarColor = new THREE.Color(sectionColorMap.home);
const targetCoreColor = new THREE.Color(sectionStoryMap.home.core);
const currentCoreColor = new THREE.Color(sectionStoryMap.home.core);
const targetRingColor = new THREE.Color(sectionStoryMap.home.ring);
const currentRingColor = new THREE.Color(sectionStoryMap.home.ring);
const clock = new THREE.Clock();
let pointerX = 0;
let pointerY = 0;
const storyTarget = { ...sectionStoryMap.home };

const applyQualityProfile = (level) => {
    qualityLevel = level;
    if (level === 'high') {
        pixelRatioCap = 1.6;
        stars.material.size = 0.15;
        stars.material.opacity = 0.8;
        renderer.toneMappingExposure = 1.05;
        canAnimateRich = window.matchMedia('(min-width: 901px)').matches && !prefersReducedMotion;
        document.body.classList.remove('low-fx');
        return;
    }
    if (level === 'medium') {
        pixelRatioCap = 1.25;
        stars.material.size = 0.13;
        stars.material.opacity = 0.72;
        renderer.toneMappingExposure = 1.0;
        canAnimateRich = false;
        document.body.classList.add('low-fx');
        return;
    }
    pixelRatioCap = 1;
    stars.material.size = 0.11;
    stars.material.opacity = 0.62;
    renderer.toneMappingExposure = 0.96;
    canAnimateRich = false;
    document.body.classList.add('low-fx');
};
applyQualityProfile(window.innerWidth < 900 ? 'medium' : 'high');
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioCap));

window.addEventListener('pointermove', (event) => {
    pointerX = (event.clientX / window.innerWidth) * 2 - 1;
    pointerY = (event.clientY / window.innerHeight) * 2 - 1;
});

function animate() {
    requestAnimationFrame(animate);

    if (document.hidden) return;

    const delta = Math.min(clock.getDelta(), 0.033);
    if (!prefersReducedMotion) {
        stars.rotation.y += delta * 0.18;
        stars.rotation.x += delta * 0.04;
        camera.position.x += ((pointerX * 2.5) - camera.position.x) * 0.05;
        camera.position.y += ((-pointerY * 1.5) - camera.position.y) * 0.05;
        storyCore.rotation.x += delta * 0.45;
        storyCore.rotation.y += delta * 0.25;
        storyRing.rotation.x -= delta * 0.18;
        storyRing.rotation.y += delta * 0.22;
    }

    if (isMorphingStory && !prefersReducedMotion) {
        morphProgress = Math.min(1, morphProgress + (delta * morphSpeed));
        const morphScale = morphProgress < 0.5
            ? 1 - (morphProgress * 1.6)
            : 0.2 + ((morphProgress - 0.5) * 1.6);
        storyCore.scale.setScalar(Math.max(0.1, morphScale));

        if (morphProgress >= 0.5 && currentStoryShape !== pendingStoryShape) {
            setStoryGeometry(pendingStoryShape);
        }

        if (morphProgress >= 1) {
            isMorphingStory = false;
            morphProgress = 0;
            storyCore.scale.setScalar(1);
        }
    } else if (!isMorphingStory) {
        const nextCoreScale = storyCore.scale.x + ((1 - storyCore.scale.x) * 0.08);
        storyCore.scale.setScalar(nextCoreScale);
    }

    currentStarColor.lerp(targetStarColor, 0.04);
    stars.material.color.copy(currentStarColor);
    storyGroup.position.x += (storyTarget.x - storyGroup.position.x) * 0.04;
    storyGroup.position.y += (storyTarget.y - storyGroup.position.y) * 0.04;
    storyGroup.position.z += (storyTarget.z - storyGroup.position.z) * 0.04;
    storyGroup.rotation.x += (storyTarget.rx - storyGroup.rotation.x) * 0.05;
    storyGroup.rotation.y += (storyTarget.ry - storyGroup.rotation.y) * 0.05;
    storyGroup.rotation.z += (storyTarget.rz - storyGroup.rotation.z) * 0.05;
    const currentScale = storyGroup.scale.x;
    const nextScale = currentScale + (storyTarget.scale - currentScale) * 0.06;
    storyGroup.scale.set(nextScale, nextScale, nextScale);
    currentCoreColor.lerp(targetCoreColor, 0.05);
    currentRingColor.lerp(targetRingColor, 0.05);
    storyCore.material.color.copy(currentCoreColor);
    storyRing.material.color.copy(currentRingColor);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);

    frameCounter += 1;
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioCap));
    renderer.setSize(window.innerWidth, window.innerHeight);
});

setInterval(() => {
    const now = performance.now();
    const elapsed = now - fpsStartTs;
    if (elapsed < 2000) return;
    const fps = (frameCounter * 1000) / elapsed;
    frameCounter = 0;
    fpsStartTs = now;

    if (fps < 30 && qualityLevel !== 'low') {
        applyQualityProfile('low');
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioCap));
        return;
    }
    if (fps < 42 && qualityLevel === 'high') {
        applyQualityProfile('medium');
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioCap));
        return;
    }
    if (fps > 55 && qualityLevel !== 'high' && !prefersReducedMotion) {
        applyQualityProfile('high');
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioCap));
    }
}, 2400);

// 3. NAV ACTIVE
window.addEventListener('scroll', () => {
    let current = '';
    const sections = document.querySelectorAll('section');
    sections.forEach((s) => {
        if (pageYOffset >= s.offsetTop - 150) current = s.getAttribute('id');
    });

    document.querySelectorAll('.nav-links a').forEach((a) => {
        a.classList.remove('active');
        if (a.getAttribute('href').includes(current)) a.classList.add('active');
    });
    document.querySelectorAll('.section-hud a').forEach((a) => {
        a.classList.remove('active');
        if (a.getAttribute('href').includes(current)) a.classList.add('active');
    });

    if (current && sectionColorMap[current]) {
        targetStarColor.set(sectionColorMap[current]);
    }
    if (current && sectionStoryMap[current]) {
        Object.assign(storyTarget, sectionStoryMap[current]);
        targetCoreColor.set(sectionStoryMap[current].core);
        targetRingColor.set(sectionStoryMap[current].ring);
        startStoryMorph(sectionStoryMap[current].shape);
    }
});

// 4. HERO ROLE TYPEWRITER
const roleTitle = document.querySelector('.role-title');
if (roleTitle) {
    const roles = [
        'IT Project Manager',
        'Prompt Ingenieur',
        'Developpeur Fullstack',
        'AI Trainer'
    ];

    let roleIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    const typingSpeed = 90;
    const deletingSpeed = 55;
    const holdDelay = 1300;

    const typeRole = () => {
        const currentRole = roles[roleIndex];
        roleTitle.textContent = currentRole.slice(0, charIndex);

        if (!isDeleting && charIndex < currentRole.length) {
            charIndex += 1;
            setTimeout(typeRole, typingSpeed);
            return;
        }

        if (!isDeleting && charIndex === currentRole.length) {
            isDeleting = true;
            setTimeout(typeRole, holdDelay);
            return;
        }

        if (isDeleting && charIndex > 0) {
            charIndex -= 1;
            setTimeout(typeRole, deletingSpeed);
            return;
        }

        isDeleting = false;
        roleIndex = (roleIndex + 1) % roles.length;
        setTimeout(typeRole, 250);
    };

    roleTitle.classList.add('typing-title');
    roleTitle.textContent = '';
    typeRole();
}

// 5. INTERACTIONS 3D (TILT + SPOTLIGHT + REVEAL)
if (!prefersReducedMotion) {
    const tiltCards = document.querySelectorAll('.service-box, .project-card, .certifications-box');
    tiltCards.forEach((card) => {
        card.addEventListener('mousemove', (event) => {
            if (!canAnimateRich) return;
            const rect = card.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            const rotateY = ((x / rect.width) - 0.5) * 12;
            const rotateX = (0.5 - (y / rect.height)) * 10;
            card.style.transform = `translateY(-8px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;

            if (card.classList.contains('project-card')) {
                card.style.setProperty('--mx', `${x}px`);
                card.style.setProperty('--my', `${y}px`);
            }
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
            if (card.classList.contains('project-card')) {
                card.style.setProperty('--mx', '50%');
                card.style.setProperty('--my', '50%');
            }
        });
    });
}

const resumeItems = document.querySelectorAll('.resume-item');
if (resumeItems.length > 0 && 'IntersectionObserver' in window) {
    const resumeObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            const col = entry.target.closest('.resume-col');
            const itemsInCol = col ? Array.from(col.querySelectorAll('.resume-item')) : [];
            const index = itemsInCol.indexOf(entry.target);
            const delay = Math.max(0, index) * 110;

            setTimeout(() => {
                entry.target.classList.add('in-view');
            }, delay);

            observer.unobserve(entry.target);
        });
    }, { threshold: 0.25 });

    resumeItems.forEach((item) => resumeObserver.observe(item));
}

// 7. MOBILE RESUME LAYOUT (SWITCH + SEE MORE)
const resumeSection = document.getElementById('resume');
const resumeSwitchBtns = resumeSection ? Array.from(resumeSection.querySelectorAll('.resume-switch-btn')) : [];
const resumeColumns = resumeSection ? {
    exp: resumeSection.querySelector('.resume-col--exp'),
    edu: resumeSection.querySelector('.resume-col--edu')
} : {};

const setResumeMobileView = (view) => {
    if (!resumeSection) return;
    const isMobile = window.matchMedia('(max-width: 900px)').matches;

    const cols = [resumeColumns.exp, resumeColumns.edu].filter(Boolean);
    cols.forEach((col) => col.classList.remove('mobile-visible'));
    if (resumeColumns.exp) {
        resumeColumns.exp.setAttribute('aria-hidden', 'true');
        resumeColumns.exp.setAttribute('tabindex', '-1');
    }
    if (resumeColumns.edu) {
        resumeColumns.edu.setAttribute('aria-hidden', 'true');
        resumeColumns.edu.setAttribute('tabindex', '-1');
    }

    if (!isMobile) {
        cols.forEach((col) => col.classList.add('mobile-visible'));
        cols.forEach((col) => {
            col.setAttribute('aria-hidden', 'false');
            col.removeAttribute('tabindex');
        });
        resumeSwitchBtns.forEach((btn) => {
            btn.classList.remove('active');
            btn.setAttribute('aria-selected', 'false');
        });
        return;
    }

    const targetCol = view === 'edu' ? resumeColumns.edu : resumeColumns.exp;
    if (targetCol) {
        targetCol.classList.add('mobile-visible');
        targetCol.setAttribute('aria-hidden', 'false');
        targetCol.removeAttribute('tabindex');
    }
    resumeSwitchBtns.forEach((btn) => {
        const active = btn.dataset.resumeView === (view === 'edu' ? 'edu' : 'exp');
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
};

const setupResumeSeeMore = () => {
    if (!resumeSection) return;
    const isMobile = window.matchMedia('(max-width: 900px)').matches;
    const cols = [resumeColumns.exp, resumeColumns.edu].filter(Boolean);

    cols.forEach((col) => {
        const items = Array.from(col.querySelectorAll('.resume-item'));
        let toggleBtn = col.querySelector('.resume-more-btn');

        items.forEach((item) => item.classList.remove('resume-item-hidden'));
        col.classList.remove('expanded');

        if (!isMobile || items.length <= 4) {
            if (toggleBtn) toggleBtn.remove();
            return;
        }

        items.forEach((item, index) => {
            if (index >= 4) item.classList.add('resume-item-hidden');
        });

        if (!toggleBtn) {
            toggleBtn = document.createElement('button');
            toggleBtn.type = 'button';
            toggleBtn.className = 'resume-more-btn';
            col.appendChild(toggleBtn);
        }

        const refreshLabel = () => {
            toggleBtn.textContent = col.classList.contains('expanded') ? 'Voir moins' : 'Voir plus';
        };

        toggleBtn.onclick = () => {
            col.classList.toggle('expanded');
            const expanded = col.classList.contains('expanded');
            items.forEach((item, index) => {
                if (index >= 4) item.classList.toggle('resume-item-hidden', !expanded);
            });
            refreshLabel();
        };

        refreshLabel();
    });
};

if (resumeSection) {
    resumeSwitchBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            setResumeMobileView(btn.dataset.resumeView === 'edu' ? 'edu' : 'exp');
            setupResumeSeeMore();
        });
    });

    const initialView = resumeSwitchBtns.find((btn) => btn.classList.contains('active'))?.dataset.resumeView || 'exp';
    setResumeMobileView(initialView);
    setupResumeSeeMore();

    window.addEventListener('resize', () => {
        const activeView = resumeSwitchBtns.find((btn) => btn.classList.contains('active'))?.dataset.resumeView || 'exp';
        setResumeMobileView(activeView);
        setupResumeSeeMore();
    });
}

// 6. PROJECT CASE STUDY PANEL
const caseStudies = {
    'SAYGOO Platform': {
        context: 'Objectif: construire une plateforme web complete et evolutive pour centraliser les besoins metier.',
        role: 'Role: architecture technique, backend, integration des donnees et stabilite applicative.',
        result: 'Resultat: plateforme plus robuste, meilleure maintenabilite et base solide pour la croissance.',
        link: '#contact'
    },
    'Clinic+': {
        context: 'Objectif: proposer une application mobile sante plus accessible et plus intelligente.',
        role: 'Role: conception produit, integration IA et coordination des briques techniques Flutter.',
        result: 'Resultat: prototype fonctionnel avec experience utilisateur modernisee pour le medical.',
        link: '#contact'
    },
    'CODORAH': {
        context: 'Objectif: digitaliser education et innovation sociale via des solutions locales utiles.',
        role: 'Role: fondatrice et lead tech, strategie produit, execution no-code/web et pilotage projet.',
        result: 'Resultat: presence digitale active et offres mieux structurees pour les clients cibles.',
        link: 'https://jbkbusiness.my.canva.site/codorah'
    },
    'Coeur Repare - Mini-site No-Code': {
        context: 'Objectif: offrir une experience emotionnelle personnalisee via un mini test et des exercices adaptes.',
        role: 'Role: concept UX, structure narrative et implementation no-code sur Canva.',
        result: 'Resultat: experience engageante orientee progression de guerison, simple a partager.',
        link: 'https://minisaintvalentin.my.canva.site/goumin'
    },
    'Portfolio 3D Personnel': {
        context: 'Objectif: presenter profil, competences et projets dans une interface immersive moderne.',
        role: 'Role: design UI/UX, animation 3D Three.js, optimisation performance et accessibilite.',
        result: 'Resultat: portfolio plus memorable, interactif et aligne avec un positionnement premium.',
        link: '#home'
    }
};

const caseModal = document.getElementById('caseModal');
const caseTitle = document.getElementById('caseTitle');
const caseContext = document.getElementById('caseContext');
const caseRole = document.getElementById('caseRole');
const caseResult = document.getElementById('caseResult');
const caseLink = document.getElementById('caseLink');

const closeCaseModal = () => {
    if (!caseModal) return;
    caseModal.classList.remove('open');
    caseModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
};

const openCaseModal = (title) => {
    if (!caseModal || !caseStudies[title]) return;
    const data = caseStudies[title];
    caseTitle.textContent = title;
    caseContext.textContent = data.context;
    caseRole.textContent = data.role;
    caseResult.textContent = data.result;
    caseLink.setAttribute('href', data.link);
    caseLink.setAttribute('target', data.link.startsWith('#') ? '_self' : '_blank');
    caseModal.classList.add('open');
    caseModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
};

document.querySelectorAll('.project-card').forEach((card) => {
    const title = card.querySelector('h3')?.textContent?.trim();
    if (!title || !caseStudies[title]) return;
    const info = card.querySelector('.project-info');
    if (!info || info.querySelector('.case-trigger')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'case-trigger';
    btn.textContent = 'Case Study';
    btn.addEventListener('click', () => openCaseModal(title));
    info.appendChild(btn);
});

if (caseModal) {
    caseModal.addEventListener('click', (event) => {
        const target = event.target;
        if (target instanceof HTMLElement && target.dataset.caseClose === 'true') {
            closeCaseModal();
        }
    });
}

window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeCaseModal();
});

window.dispatchEvent(new Event('scroll'));

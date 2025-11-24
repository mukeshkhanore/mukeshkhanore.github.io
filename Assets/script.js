// Security: HTML Sanitization Utility
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Security: Input Validation
function validatePortfolioData(data) {
    if (!data || typeof data !== 'object') {
        console.error('Invalid portfolio data: not an object');
        return false;
    }

    // Validate required sections
    const requiredSections = ['profile', 'education', 'experience', 'projects', 'publications', 'activities', 'skills', 'certificates', 'teaching'];
    for (const section of requiredSections) {
        if (!data[section]) {
            console.error(`Invalid portfolio data: missing ${section} section`);
            return false;
        }
    }

    // Validate profile section
    if (!data.profile.name || !data.profile.titles || !data.profile.bio) {
        console.error('Invalid portfolio data: missing required profile fields');
        return false;
    }

    return true;
}

document.addEventListener('DOMContentLoaded', () => {
    // Theme Toggle Logic
    // Background Animation: Particle Network
    const canvas = document.getElementById('bg-canvas');
    const ctx = canvas.getContext('2d');

    let particlesArray;

    // Set Canvas Size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.directionX = (Math.random() * 0.6) - 0.3; // Increased speed slightly
            this.directionY = (Math.random() * 0.6) - 0.3;
            this.size = Math.random() * 3 + 2; // Increased size: 2 to 5px
            this.color = '#00e1ff'; // Cyan
        }

        // Method to draw individual particle
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
            ctx.fillStyle = this.color;
            ctx.globalAlpha = 0.4; // Reduced opacity for readability (was 0.8)
            ctx.fill();
        }

        // Check particle position, check mouse position, move the particle, draw the particle
        update() {
            // Check if particle is still within canvas
            if (this.x > canvas.width || this.x < 0) {
                this.directionX = -this.directionX;
            }
            if (this.y > canvas.height || this.y < 0) {
                this.directionY = -this.directionY;
            }

            // Move particle
            this.x += this.directionX;
            this.y += this.directionY;

            // Draw particle
            this.draw();
        }
    }

    // Create particle array
    function init() {
        particlesArray = [];
        let numberOfParticles = (canvas.height * canvas.width) / 6000; // Increased density (was 9000)
        for (let i = 0; i < numberOfParticles; i++) {
            particlesArray.push(new Particle());
        }
    }

    // Animation Loop
    function animate() {
        requestAnimationFrame(animate);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < particlesArray.length; i++) {
            particlesArray[i].update();
        }
        connect();
    }

    // Check if particles are close enough to draw line
    function connect() {
        let opacityValue = 1;
        for (let a = 0; a < particlesArray.length; a++) {
            for (let b = a; b < particlesArray.length; b++) {
                let distance = ((particlesArray[a].x - particlesArray[b].x) * (particlesArray[a].x - particlesArray[b].x)) +
                    ((particlesArray[a].y - particlesArray[b].y) * (particlesArray[a].y - particlesArray[b].y));

                // Increased connection distance (was /7 * /7)
                if (distance < (canvas.width / 6) * (canvas.height / 6)) {
                    opacityValue = 1 - (distance / 25000); // Adjusted fade factor
                    ctx.strokeStyle = 'rgba(0, 225, 255,' + opacityValue * 0.2 + ')'; // Reduced line opacity (was 0.4)
                    ctx.lineWidth = 1.5; // Thicker lines
                    ctx.beginPath();
                    ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
                    ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
                    ctx.stroke();
                }
            }
        }
    }

    // Resize event
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        init();
    });

    // Start animation
    init();
    animate();
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = themeToggleBtn.querySelector('i');
    const body = document.body;

    // Check for saved theme preference (Security: validate against whitelist)
    const savedTheme = localStorage.getItem('theme') || 'atomic';
    const validThemes = ['atomic', 'light', 'contrast'];
    applyTheme(validThemes.includes(savedTheme) ? savedTheme : 'atomic');

    themeToggleBtn.addEventListener('click', () => {
        let currentTheme = body.getAttribute('data-theme');
        let newTheme = 'atomic';

        if (currentTheme === 'atomic') {
            newTheme = 'light';
        } else if (currentTheme === 'light') {
            newTheme = 'contrast';
        } else {
            newTheme = 'atomic';
        }

        applyTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    });

    // Mobile Menu Logic
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            hamburger.setAttribute('aria-expanded', navLinks.classList.contains('active'));
        });

        // Close menu when clicking a link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                hamburger.setAttribute('aria-expanded', 'false');
            });
        });
    }

    function applyTheme(theme) {
        body.setAttribute('data-theme', theme);

        // Update Icon
        themeIcon.className = '';
        if (theme === 'atomic') {
            themeIcon.className = 'fas fa-moon';
            themeToggleBtn.title = "Switch to Light Mode";
        } else if (theme === 'light') {
            themeIcon.className = 'fas fa-sun';
            themeToggleBtn.title = "Switch to High Contrast";
        } else {
            themeIcon.className = 'fas fa-adjust';
            themeToggleBtn.title = "Switch to Atomic Mode";
        }
    }

    // Load Content from Data Object (Synchronous, Security: validate before rendering)
    if (typeof portfolioData !== 'undefined' && validatePortfolioData(portfolioData)) {
        renderProfile(portfolioData.profile);
        renderEducation(portfolioData.education);
        renderProjects(portfolioData.projects);
        renderExperience(portfolioData.experience);
        renderPublications(portfolioData.publications);
        renderActivities(portfolioData.activities);
        renderSkills(portfolioData.skills);
        renderCertificates(portfolioData.certificates);
        renderTeaching(portfolioData.teaching);
    } else {
        console.error('Portfolio data not found or invalid. Ensure data.js is loaded correctly.');
        document.getElementById('profile-name').textContent = 'Error Loading Portfolio';
        document.getElementById('profile-bio').textContent = 'Unable to load portfolio data. Please refresh the page.';
    }
});

// Rendering Functions (Security: All user-controlled strings are HTML-escaped)
function renderProfile(profile) {
    document.getElementById('profile-name').textContent = profile.name;
    document.getElementById('profile-titles').textContent = profile.titles;
    document.getElementById('profile-bio').textContent = profile.bio;
    document.getElementById('profile-avatar').src = profile.avatar;

    const socialContainer = document.getElementById('social-links');
    socialContainer.innerHTML = profile.social.map(link => `
        <a href="${link.url}" class="social-icon" title="${escapeHtml(link.name)}" target="_blank" rel="noopener noreferrer"><i class="${link.icon}"></i></a>
    `).join('');
}

function renderEducation(education) {
    const container = document.getElementById('education-grid');
    container.innerHTML = education.map(edu => `
        <div class="card">
            <h3>${escapeHtml(edu.degree)}</h3>
            <h4>${escapeHtml(edu.institution)}</h4>
            <div class="meta">${escapeHtml(edu.meta)}</div>
            <p>${escapeHtml(edu.description)}</p>
        </div>
    `).join('');
}

function renderProjects(projects) {
    const container = document.getElementById('projects-grid');
    container.innerHTML = projects.map(project => `
        <div class="masonry-item">
            <a href="${project.url}" target="_blank" rel="noopener noreferrer" class="card">
                <h3>${escapeHtml(project.name)}</h3>
                <div class="meta">${escapeHtml(project.meta)}</div>
                <p>${escapeHtml(project.description)}</p>
                ${project.tags.length ? `
                <div class="skills-list" style="margin-top: 1rem;">
                    ${project.tags.map(tag => `<span class="skill-tag" style="font-size: 0.8rem;">${escapeHtml(tag)}</span>`).join('')}
                </div>` : ''}
            </a>
        </div>
    `).join('');
}

function renderExperience(experience) {
    const container = document.getElementById('experience-grid');
    container.innerHTML = experience.map(exp => `
        <article class="card">
            <h3>${escapeHtml(exp.role)}</h3>
            <h4>${escapeHtml(exp.company)}</h4>
            <div class="meta">${escapeHtml(exp.period)}</div>
            <ul>
                ${exp.details.map(detail => `<li>${escapeHtml(detail)}</li>`).join('')}
            </ul>
        </article>
    `).join('');
}

function renderPublications(publications) {
    const container = document.getElementById('publications-grid');
    container.innerHTML = publications.map(pub => `
        <a href="${pub.url}" target="_blank" rel="noopener noreferrer" class="card" style="display: block; text-decoration: none;">
            <h3>${escapeHtml(pub.title)} <i class="fas fa-external-link-alt" style="font-size: 0.8em; margin-left: 5px;"></i></h3>
            <div class="meta">${escapeHtml(pub.meta)}</div>
            <p>${escapeHtml(pub.authors)}</p>
            ${pub.description ? `<p>${escapeHtml(pub.description)}</p>` : ''}
        </a>
    `).join('');
}

function renderActivities(activities) {
    const container = document.getElementById('activities-grid');
    container.innerHTML = activities.map(act => `
        <div class="card">
            <h3>${escapeHtml(act.title)}</h3>
            <div class="meta">${escapeHtml(act.meta)}</div>
            <p>${escapeHtml(act.description)}</p>
        </div>
    `).join('');
}

function renderSkills(skills) {
    document.getElementById('skills-languages').innerHTML = skills.languages.map(skill => `<li class="skill-tag">${escapeHtml(skill)}</li>`).join('');

    document.getElementById('skills-ml').innerHTML = skills.ml_tools.map(skill => `<li class="skill-tag">${escapeHtml(skill)}</li>`).join('');

    document.getElementById('skills-numerical').innerHTML = skills.numerical.map(item => `<li>${escapeHtml(item)}</li>`).join('');

    document.getElementById('skills-cloud').innerHTML = skills.cloud.map(item => `<li>${escapeHtml(item)}</li>`).join('');
}

function renderCertificates(certificates) {
    const container = document.getElementById('certificates-grid');
    container.innerHTML = certificates.map(cert => `
        <a href="${cert.url}" target="_blank" rel="noopener noreferrer" class="certificate-card">
            <i class="${cert.icon} badge-icon"></i>
            <h3>${escapeHtml(cert.title)}</h3>
            <p>${escapeHtml(cert.issuer)}</p>
        </a>
    `).join('');
}

function renderTeaching(teaching) {
    const container = document.getElementById('teaching-grid');
    container.innerHTML = teaching.map(teach => `
        <div class="card">
            <h3>${escapeHtml(teach.role)}</h3>
            <div class="meta">${escapeHtml(teach.institution)}</div>
            <p>${escapeHtml(teach.description)}</p>
        </div>
    `).join('');
}

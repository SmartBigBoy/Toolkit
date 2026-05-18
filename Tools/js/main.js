document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search');
    const toolCards = document.querySelectorAll('.tool-card');

    searchInput.addEventListener('input', (e) => {
        const keyword = e.target.value.toLowerCase();
        let visibleCount = 0;

        toolCards.forEach(card => {
            const name = card.dataset.name.toLowerCase();
            const desc = card.dataset.desc.toLowerCase();
            
            if (name.includes(keyword) || desc.includes(keyword)) {
                card.style.display = 'block';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        const sections = document.querySelectorAll('.category, .quick-tools');
        sections.forEach(section => {
            const cardsInSection = section.querySelectorAll('.tool-card');
            const hasVisibleCard = Array.from(cardsInSection).some(card => card.style.display === 'block');
            section.style.display = hasVisibleCard ? 'block' : 'none';
        });
    });

    document.querySelectorAll('.tool-card').forEach(card => {
        card.addEventListener('click', () => {
            const toolName = card.dataset.name;
            localStorage.setItem('lastTool', toolName);
        });
    });
});
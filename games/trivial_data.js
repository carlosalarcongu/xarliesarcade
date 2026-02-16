module.exports = {
    // Categorías: GEO (Azul), ENT (Rosa), HIS (Amarillo), ART (Marrón), CIE (Verde), DEP (Naranja)
    CATEGORIES: {
        GEO: { id: 'GEO', name: 'Geografía', color: '#0984e3', icon: '🌍' },
        ENT: { id: 'ENT', name: 'Entretenimiento', color: '#e84393', icon: '🎬' },
        HIS: { id: 'HIS', name: 'Historia', color: '#f1c40f', icon: '🏺' },
        ART: { id: 'ART', name: 'Arte y Lit.', color: '#a0522d', icon: '🎨' },
        CIE: { id: 'CIE', name: 'Ciencias', color: '#00b894', icon: '🔬' },
        DEP: { id: 'DEP', name: 'Deportes', color: '#e67e22', icon: '⚽' },
        HUB: { id: 'HUB', name: 'Centro', color: '#ecf0f1', icon: '🎲' } // Casilla central/blanca
    },
    QUESTIONS: [
        { id: 1, c: 'GEO', q: "¿Capital de Australia?", a: "Canberra" },
        { id: 2, c: 'ENT', q: "¿Quién dirigió 'Titanic'?", a: "James Cameron" },
        { id: 3, c: 'HIS', q: "¿Año de la Revolución Francesa?", a: "1789" },
        { id: 4, c: 'ART', q: "¿Pintor del Guernica?", a: "Picasso" },
        { id: 5, c: 'CIE', q: "¿Planeta rojo?", a: "Marte" },
        { id: 6, c: 'DEP', q: "¿Rey del tenis en tierra batida?", a: "Rafa Nadal" },
        // ... Añade cientos más aquí. El sistema evitará repetirlas por ID.
        { id: 7, c: 'GEO', q: "¿Río más largo de España?", a: "Tajo" },
        { id: 8, c: 'ENT', q: "¿Protagonista de Matrix?", a: "Neo / Keanu Reeves" }
    ]
};
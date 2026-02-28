// UNI Course Data - Organized by Faculty > Cycle > Courses
// Based on Universidad Nacional de Ingeniería curricula

export interface FacultyInfo {
    code: string
    name: string
    color: string
    courses: Record<number, string[]> // cycle number -> course names
}

export const UNI_FACULTIES_DATA: Record<string, FacultyInfo> = {
    FIIS: {
        code: 'FIIS',
        name: 'Ingeniería Industrial y de Sistemas',
        color: '#1abc9c',
        courses: {
            1: ['Cálculo I', 'Álgebra Lineal', 'Química General', 'Dibujo Técnico', 'Introducción a la Ingeniería Industrial'],
            2: ['Cálculo II', 'Física I', 'Programación I', 'Estadística Descriptiva', 'Comunicación y Redacción'],
            3: ['Cálculo III', 'Física II', 'Programación II', 'Estadística Inferencial', 'Contabilidad General'],
            4: ['Ecuaciones Diferenciales', 'Física III', 'Investigación Operativa I', 'Economía General', 'Métodos Numéricos'],
            5: ['Investigación Operativa II', 'Ingeniería de Métodos', 'Microeconomía', 'Termodinámica', 'Base de Datos'],
            6: ['Gestión de Calidad', 'Ingeniería Económica', 'Procesos de Manufactura', 'Simulación de Sistemas', 'Diseño de Sistemas'],
            7: ['Gestión de Operaciones', 'Logística y Cadena de Suministro', 'Ingeniería de Software', 'Finanzas', 'Seguridad Industrial'],
            8: ['Planificación y Control de la Producción', 'Gestión de Proyectos', 'Marketing', 'Sistemas de Información', 'Ingeniería Ambiental'],
            9: ['Gestión Estratégica', 'Emprendimiento e Innovación', 'Automatización Industrial', 'Taller de Tesis I', 'Electivo I'],
            10: ['Práctica Pre-Profesional', 'Taller de Tesis II', 'Gestión del Talento Humano', 'Electivo II', 'Electivo III'],
        }
    },
    FIC: {
        code: 'FIC',
        name: 'Ingeniería Civil',
        color: '#3498db',
        courses: {
            1: ['Cálculo I', 'Álgebra Lineal', 'Química General', 'Dibujo Técnico', 'Geología General'],
            2: ['Cálculo II', 'Física I', 'Topografía I', 'Geometría Descriptiva', 'Estática'],
            3: ['Cálculo III', 'Física II', 'Topografía II', 'Resistencia de Materiales I', 'Mecánica de Fluidos I'],
            4: ['Ecuaciones Diferenciales', 'Resistencia de Materiales II', 'Mecánica de Fluidos II', 'Análisis Estructural I', 'Geotecnia I'],
            5: ['Métodos Numéricos', 'Análisis Estructural II', 'Geotecnia II', 'Hidrología', 'Tecnología del Concreto'],
            6: ['Concreto Armado I', 'Ingeniería de Cimentaciones', 'Hidráulica', 'Caminos I', 'Construcción I'],
            7: ['Concreto Armado II', 'Estructuras de Acero', 'Ingeniería Sanitaria', 'Caminos II', 'Construcción II'],
            8: ['Concreto Presforzado', 'Puentes', 'Irrigación', 'Ingeniería de Tránsito', 'Gestión de Proyectos'],
            9: ['Ingeniería Antisísmica', 'Presas', 'Edificaciones', 'Taller de Tesis I', 'Electivo I'],
            10: ['Práctica Pre-Profesional', 'Taller de Tesis II', 'Supervisión de Obras', 'Electivo II', 'Electivo III'],
        }
    },
    FIEE: {
        code: 'FIEE',
        name: 'Ingeniería Eléctrica y Electrónica',
        color: '#e67e22',
        courses: {
            1: ['Actividades Extracurriculares', 'Física I', 'Introducción a la Computación', 'Cálculo Diferencial', 'Álgebra Lineal', 'Realidad Nacional, Constitución y Derechos Humanos', 'Dibujo Técnico'],
            2: ['Fundamentos de Ingeniería Térmica y de Fluidos', 'Cálculo Integral', 'Algoritmos y Estructuras de Datos I', 'Química I', 'Redacción y Comunicación', 'Fundamentos de Ingeniería del Computador'],
            3: ['Economía General', 'Fundamentos de Electricidad, Magnetismo y Óptica', 'Ecuaciones Diferenciales', 'Probabilidades y Estadística', 'Programación Orientada a Objetos', 'Electrotecnia e Instalación de Redes'],
            4: ['Ética y Filosofía Política', 'Introducción a la Física Moderna', 'Idioma Extranjero o Lengua Nativa en el Nivel Intermedio', 'Cálculo Vectorial', 'Métodos Numéricos', 'Circuitos Eléctricos I', 'Análisis de Señales y Sistemas'],
            5: ['Dispositivos y Circuitos Electrónicos I', 'Circuitos Eléctricos II', 'Laboratorio de Electrónica I', 'Sistemas de Comunicaciones I', 'Electromagnetismo I', 'Sistemas de Control I'],
            6: ['Dispositivos y Circuitos Electrónicos II', 'Laboratorio de Electrónica II', 'Electromagnetismo II', 'Introducción a Microcontroladores', 'Sistemas de Control II'],
            7: ['Conversión de Energía Electromecánica', 'Sistemas de Comunicaciones II', 'Diseño Lógico Digital', 'Instrumentación y Control de Procesos Industriales'],
            8: ['Formulación y Evaluación de Proyectos', 'Electrónica de Radiocomunicaciones', 'Electrónica de Potencia'],
            9: ['Proyecto de Fin de Carrera', 'Laboratorio de Radiocomunicaciones'],
            10: ['Proyecto de Tesis'],
        }
    },
    FIM: {
        code: 'FIM',
        name: 'Ingeniería Mecánica',
        color: '#22d3ee',
        courses: {
            1: ['Cálculo I', 'Álgebra Lineal', 'Química General', 'Dibujo Técnico', 'Introducción a la Ingeniería Mecánica'],
            2: ['Cálculo II', 'Física I', 'Estática', 'Programación I', 'Ciencia de los Materiales'],
            3: ['Cálculo III', 'Física II', 'Dinámica', 'Resistencia de Materiales I', 'Termodinámica I'],
            4: ['Ecuaciones Diferenciales', 'Resistencia de Materiales II', 'Termodinámica II', 'Mecánica de Fluidos I', 'Mecanismos'],
            5: ['Métodos Numéricos', 'Mecánica de Fluidos II', 'Transferencia de Calor', 'Diseño de Máquinas I', 'Metalurgia Física'],
            6: ['Diseño de Máquinas II', 'Turbomáquinas', 'Ingeniería de Materiales', 'Procesos de Manufactura I', 'Vibraciones Mecánicas'],
            7: ['Máquinas Térmicas', 'Procesos de Manufactura II', 'Sistemas Hidráulicos y Neumáticos', 'Refrigeración y Aire Acondicionado', 'Control Automático'],
            8: ['Mantenimiento Industrial', 'Ingeniería Automotriz', 'Diseño Asistido por Computadora', 'Plantas Industriales', 'Gestión de Proyectos'],
            9: ['Ingeniería de Gas Natural', 'Energías Renovables', 'Robótica', 'Taller de Tesis I', 'Electivo I'],
            10: ['Práctica Pre-Profesional', 'Taller de Tesis II', 'Ingeniería de Producción', 'Electivo II', 'Electivo III'],
        }
    },
    FC: {
        code: 'FC',
        name: 'Ciencias',
        color: '#a78bfa',
        courses: {
            1: ['Cálculo I', 'Álgebra Lineal', 'Química General', 'Física General I', 'Introducción a las Ciencias'],
            2: ['Cálculo II', 'Física General II', 'Programación I', 'Química Orgánica', 'Biología General'],
            3: ['Cálculo III', 'Física III', 'Programación II', 'Álgebra Abstracta', 'Análisis Matemático'],
            4: ['Ecuaciones Diferenciales', 'Física Moderna', 'Probabilidad y Estadística', 'Topología', 'Variable Compleja'],
            5: ['Análisis Funcional', 'Mecánica Clásica', 'Métodos Numéricos', 'Investigación Operativa', 'Análisis Real'],
            6: ['Mecánica Cuántica I', 'Ecuaciones en Derivadas Parciales', 'Geometría Diferencial', 'Termodinámica Estadística', 'Modelamiento Matemático'],
            7: ['Mecánica Cuántica II', 'Electrodinámica', 'Teoría de Números', 'Simulación Computacional', 'Óptica'],
            8: ['Física del Estado Sólido', 'Física Nuclear', 'Optimización', 'Ciencia de Datos', 'Gestión de Proyectos'],
            9: ['Astrofísica', 'Biofísica', 'Inteligencia Artificial', 'Taller de Tesis I', 'Electivo I'],
            10: ['Práctica Pre-Profesional', 'Taller de Tesis II', 'Seminario de Investigación', 'Electivo II', 'Electivo III'],
        }
    },
    FAUA: {
        code: 'FAUA',
        name: 'Arquitectura, Urbanismo y Artes',
        color: '#e74c3c',
        courses: {
            1: ['Diseño Arquitectónico I', 'Dibujo Artístico I', 'Historia de la Arquitectura I', 'Matemática Básica', 'Geometría Descriptiva'],
            2: ['Diseño Arquitectónico II', 'Dibujo Artístico II', 'Historia de la Arquitectura II', 'Física Aplicada', 'Expresión Gráfica'],
            3: ['Diseño Arquitectónico III', 'Construcción I', 'Historia de la Arquitectura III', 'Estática', 'Topografía'],
            4: ['Diseño Arquitectónico IV', 'Construcción II', 'Urbanismo I', 'Resistencia de Materiales', 'Instalaciones Eléctricas'],
            5: ['Diseño Arquitectónico V', 'Construcción III', 'Urbanismo II', 'Estructuras I', 'Instalaciones Sanitarias'],
            6: ['Diseño Arquitectónico VI', 'Acondicionamiento Ambiental', 'Urbanismo III', 'Estructuras II', 'Paisajismo'],
            7: ['Diseño Arquitectónico VII', 'Restauración y Patrimonio', 'Planificación Urbana', 'Diseño Interior', 'Presupuestos y Costos'],
            8: ['Diseño Arquitectónico VIII', 'Gestión Inmobiliaria', 'Proyecto Urbano', 'Tecnología Digital', 'Gestión de Proyectos'],
            9: ['Taller de Diseño IX', 'Seminario de Urbanismo', 'Arquitectura Sostenible', 'Taller de Tesis I', 'Electivo I'],
            10: ['Práctica Pre-Profesional', 'Taller de Tesis II', 'Ética Profesional', 'Electivo II', 'Electivo III'],
        }
    },
    FIGMM: {
        code: 'FIGMM',
        name: 'Ingeniería Geológica, Minera y Metalúrgica',
        color: '#f39c12',
        courses: {
            1: ['Cálculo I', 'Álgebra Lineal', 'Química General', 'Dibujo Técnico', 'Geología General'],
            2: ['Cálculo II', 'Física I', 'Química Analítica', 'Mineralogía', 'Topografía'],
            3: ['Cálculo III', 'Física II', 'Petrología', 'Paleontología', 'Cristalografía'],
            4: ['Ecuaciones Diferenciales', 'Geología Estructural', 'Geoquímica', 'Mecánica de Rocas I', 'Sedimentología'],
            5: ['Métodos Numéricos', 'Geología de Minas', 'Yacimientos Minerales', 'Mecánica de Rocas II', 'Hidrogeología'],
            6: ['Explotación Minera I', 'Metalurgia Extractiva I', 'Geofísica', 'Perforación y Voladura', 'Ventilación de Minas'],
            7: ['Explotación Minera II', 'Metalurgia Extractiva II', 'Procesamiento de Minerales', 'Evaluación de Yacimientos', 'Medio Ambiente Minero'],
            8: ['Planeamiento de Minas', 'Pirometalurgia', 'Hidrometalurgia', 'Seguridad Minera', 'Gestión de Proyectos'],
            9: ['Economía Minera', 'Geotecnia Ambiental', 'Metalurgia de Polvos', 'Taller de Tesis I', 'Electivo I'],
            10: ['Práctica Pre-Profesional', 'Taller de Tesis II', 'Legislación Minera', 'Electivo II', 'Electivo III'],
        }
    },
    FIEECS: {
        code: 'FIEECS',
        name: 'Ingeniería Económica, Estadística y CC.SS.',
        color: '#f472b6',
        courses: {
            1: ['Cálculo I', 'Álgebra Lineal', 'Introducción a la Economía', 'Estadística Descriptiva', 'Comunicación y Redacción'],
            2: ['Cálculo II', 'Microeconomía I', 'Probabilidades', 'Contabilidad General', 'Programación I'],
            3: ['Cálculo III', 'Macroeconomía I', 'Estadística Inferencial', 'Matemática Financiera', 'Sociología'],
            4: ['Ecuaciones Diferenciales', 'Microeconomía II', 'Muestreo', 'Investigación Operativa I', 'Demografía'],
            5: ['Métodos Numéricos', 'Macroeconomía II', 'Econometría I', 'Investigación Operativa II', 'Finanzas I'],
            6: ['Economía Internacional', 'Econometría II', 'Series de Tiempo', 'Finanzas II', 'Modelos Estadísticos'],
            7: ['Política Económica', 'Evaluación de Proyectos', 'Análisis Multivariado', 'Gestión Pública', 'Mercado de Capitales'],
            8: ['Economía Ambiental', 'Planificación Económica', 'Minería de Datos', 'Seguros y Riesgos', 'Gestión de Proyectos'],
            9: ['Economía del Desarrollo', 'Big Data y Analytics', 'Regulación Económica', 'Taller de Tesis I', 'Electivo I'],
            10: ['Práctica Pre-Profesional', 'Taller de Tesis II', 'Ética Profesional', 'Electivo II', 'Electivo III'],
        }
    },
    FIQT: {
        code: 'FIQT',
        name: 'Ingeniería Química y Textil',
        color: '#2dd4bf',
        courses: {
            1: ['Cálculo I', 'Álgebra Lineal', 'Química General I', 'Dibujo Técnico', 'Introducción a la Ingeniería Química'],
            2: ['Cálculo II', 'Física I', 'Química General II', 'Química Orgánica I', 'Programación I'],
            3: ['Cálculo III', 'Física II', 'Química Orgánica II', 'Fisicoquímica I', 'Química Analítica'],
            4: ['Ecuaciones Diferenciales', 'Fisicoquímica II', 'Análisis Instrumental', 'Termodinámica Química', 'Balance de Materia y Energía'],
            5: ['Métodos Numéricos', 'Transferencia de Calor', 'Mecánica de Fluidos', 'Operaciones Unitarias I', 'Bioquímica'],
            6: ['Operaciones Unitarias II', 'Cinética Química', 'Ingeniería de Reactores I', 'Control de Procesos', 'Tecnología Textil I'],
            7: ['Ingeniería de Reactores II', 'Diseño de Plantas', 'Tecnología Textil II', 'Polímeros', 'Ingeniería Ambiental'],
            8: ['Refinación de Petróleo', 'Petroquímica', 'Acabados Textiles', 'Simulación de Procesos', 'Gestión de Proyectos'],
            9: ['Biotecnología', 'Nanotecnología', 'Gestión de Calidad', 'Taller de Tesis I', 'Electivo I'],
            10: ['Práctica Pre-Profesional', 'Taller de Tesis II', 'Seguridad Industrial', 'Electivo II', 'Electivo III'],
        }
    },
    FIP: {
        code: 'FIP',
        name: 'Ingeniería de Petróleo, Gas Natural y Petroquímica',
        color: '#f59e0b',
        courses: {
            1: ['Cálculo I', 'Álgebra Lineal', 'Química General', 'Dibujo Técnico', 'Geología General'],
            2: ['Cálculo II', 'Física I', 'Química Orgánica', 'Geología del Petróleo', 'Programación I'],
            3: ['Cálculo III', 'Física II', 'Termodinámica I', 'Mecánica de Fluidos', 'Geología Estructural'],
            4: ['Ecuaciones Diferenciales', 'Termodinámica II', 'Propiedades de Rocas', 'Perforación I', 'Geofísica del Petróleo'],
            5: ['Métodos Numéricos', 'Ingeniería de Reservorios I', 'Perforación II', 'Producción I', 'Registro de Pozos'],
            6: ['Ingeniería de Reservorios II', 'Producción II', 'Completación de Pozos', 'Transporte de Hidrocarburos', 'Recuperación Mejorada I'],
            7: ['Simulación de Reservorios', 'Recuperación Mejorada II', 'Gas Natural I', 'Refinación del Petróleo', 'Evaluación de Formaciones'],
            8: ['Gas Natural II', 'Petroquímica', 'Economía Petrolera', 'Seguridad en Operaciones', 'Gestión de Proyectos'],
            9: ['GNL y GTL', 'Gestión Ambiental', 'Legislación de Hidrocarburos', 'Taller de Tesis I', 'Electivo I'],
            10: ['Práctica Pre-Profesional', 'Taller de Tesis II', 'Comercialización de Hidrocarburos', 'Electivo II', 'Electivo III'],
        }
    },
    FIA: {
        code: 'FIA',
        name: 'Ingeniería Ambiental',
        color: '#4ade80',
        courses: {
            1: ['Cálculo I', 'Álgebra Lineal', 'Química General', 'Dibujo Técnico', 'Ecología General'],
            2: ['Cálculo II', 'Física I', 'Química Orgánica', 'Biología Ambiental', 'Programación I'],
            3: ['Cálculo III', 'Física II', 'Microbiología Ambiental', 'Estadística Ambiental', 'Meteorología'],
            4: ['Ecuaciones Diferenciales', 'Termodinámica', 'Mecánica de Fluidos', 'Hidrología', 'Geología Ambiental'],
            5: ['Métodos Numéricos', 'Calidad del Agua', 'Calidad del Aire', 'Residuos Sólidos', 'Toxicología Ambiental'],
            6: ['Tratamiento de Aguas Residuales', 'Contaminación Atmosférica', 'Gestión de Residuos Sólidos', 'Sistemas de Información Geográfica', 'Evaluación de Impacto Ambiental'],
            7: ['Remediación Ambiental', 'Ingeniería Sanitaria', 'Gestión Ambiental', 'Energías Renovables', 'Auditoría Ambiental'],
            8: ['Cambio Climático', 'Economía Ambiental', 'Biorremediación', 'Legislación Ambiental', 'Gestión de Proyectos'],
            9: ['Desarrollo Sostenible', 'Ecotecnología', 'Consultoría Ambiental', 'Taller de Tesis I', 'Electivo I'],
            10: ['Práctica Pre-Profesional', 'Taller de Tesis II', 'Ética Ambiental', 'Electivo II', 'Electivo III'],
        }
    },
}

// Get all faculty codes
export const FACULTY_CODES = Object.keys(UNI_FACULTIES_DATA)

// Get courses for a specific faculty and cycle
export function getCourses(faculty: string, cycle: number): string[] {
    return UNI_FACULTIES_DATA[faculty]?.courses[cycle] || []
}

// Get faculty info
export function getFacultyInfo(code: string): FacultyInfo | undefined {
    return UNI_FACULTIES_DATA[code]
}

// Cycle labels
export const CYCLE_LABELS: Record<number, string> = {
    1: '1er Ciclo',
    2: '2do Ciclo',
    3: '3er Ciclo',
    4: '4to Ciclo',
    5: '5to Ciclo',
    6: '6to Ciclo',
    7: '7mo Ciclo',
    8: '8vo Ciclo',
    9: '9no Ciclo',
    10: '10mo Ciclo',
}

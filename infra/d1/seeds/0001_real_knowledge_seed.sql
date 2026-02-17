PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO users (id, email, display_name)
VALUES ('user-maxli', 'maxlive@hotmail.es', 'Max');

INSERT OR IGNORE INTO projects (id, user_id, name, description, engine, status, notes) VALUES
('proj-slime-evo', 'user-maxli', 'Slime Evolution', 'Juego donde un slime devora monstruos para crecer, evolucionar y desbloquear habilidades.', 'unity', 'ideation', 'Evaluar prototipo rapido en Unity con sistema de evolucion por hitos.'),
('proj-factory-dungeon', 'user-maxli', 'Factory Dungeon', 'Concepto hibrido entre automatizacion tipo Satisfactory y estrategia tipo Dungeons.', 'unity', 'research', 'Investigar combinacion de loop logistico + combate tactico.'),
('proj-immortal-cultivation', 'user-maxli', 'Immortal Cultivation RPG', 'Juego de cultivacion inmortal con progreso por tecnicas, reinos y artefactos.', 'unreal', 'ideation', 'Comparar viabilidad entre Unity y Unreal para mundo grande.'),
('proj-aura-unity', 'user-maxli', 'Aura for Unity', 'Crear una IA tipo blueprint assistant para Unity inspirada en Aura de Unreal.', 'unity', 'research', 'Analizar pipeline de nodos visuales y copiloto de scripts.');

INSERT OR IGNORE INTO knowledge_items (id, user_id, kind, title, summary, status, domain, engine, source_url, priority, is_project_idea, next_action) VALUES
('ki-slime-mechanics', 'user-maxli', 'concept', 'Mecanicas base: slime que devora y evoluciona', 'Definir sistema de absorcion de enemigos, escalado de tamano y arbol de habilidades.', 'researching', 'programming', 'unity', NULL, 'alta', 1, 'Disenar documento de gameplay loop + diagrama de evolucion.'),
('ki-factory-dungeon-loop', 'user-maxli', 'concept', 'Loop de juego: factory + dungeon management', 'Combinar automatizacion de recursos con defensa de mazmorras y expansion territorial.', 'inbox', 'programming', 'unity', NULL, 'media', 1, 'Listar sistemas minimos viables para vertical slice.'),
('ki-cultivation-systems', 'user-maxli', 'task', 'Investigar sistemas de cultivacion inmortal', 'Recolectar referencias de progresion por reinos, tecnicas, alquimia y sectas.', 'researching', 'programming', 'unreal', NULL, 'alta', 1, 'Crear tabla comparativa de 5 juegos/novelas de referencia.'),
('ki-unreal-blueprint-agent', 'user-maxli', 'task', 'Estudiar Aura (asistente para Blueprints)', 'Analizar capacidades de Aura para edicion, sugerencias y productividad en Unreal.', 'inbox', 'mcp', 'unreal', NULL, 'media', 0, 'Documentar feature set y posibles equivalentes en Unity.'),
('ki-unity-aura-architecture', 'user-maxli', 'concept', 'Arquitectura para Aura en Unity', 'Propuesta de agente para nodos visuales, sugerencia de scripts y trazabilidad de cambios.', 'inbox', 'programming', 'unity', NULL, 'alta', 1, 'Definir MVP tecnico y stack de integracion.'),
('ki-knowledge-modal-pdf', 'user-maxli', 'task', 'Modal de conocimiento editable y exportable a PDF', 'Cuando una investigacion este completa, convertirla en guia editable y exportable.', 'ready', 'programming', 'none', NULL, 'alta', 0, 'Disenar UX del modal: ver, editar, exportar PDF.'),
('ki-universal-attachments', 'user-maxli', 'task', 'Adjuntos universales para conocimiento', 'Soportar PDF, TXT, DOCX, JPG, PNG, JPEG, GIF, video y assets 3D.', 'researching', 'programming', 'none', NULL, 'alta', 0, 'Definir pipeline de ingesta, parseo y almacenamiento por tipo.'),
('ki-web-analyzers', 'user-maxli', 'task', 'Analizadores web y buscador de fuentes', 'Agregar capturas desde internet con resumen automatico y enlaces citados.', 'inbox', 'mcp', 'none', NULL, 'media', 0, 'Probar flujo: URL -> analisis -> tarea o guia.');

INSERT OR IGNORE INTO guides (id, item_id, content_md, export_version)
VALUES
('guide-modal-pdf', 'ki-knowledge-modal-pdf',
'# Guia: Modal de Conocimiento\n\n## Objetivo\nVisualizar conocimiento investigado, editarlo y exportarlo a PDF.\n\n## Requisitos\n- Vista de contenido en markdown.\n- Boton de editar.\n- Boton de exportar PDF.\n- Historial de cambios.', 1);

INSERT OR IGNORE INTO tags (id, name, color, icon) VALUES
('tag-unity', 'Unity', '#000000', 'unity-logo'),
('tag-unreal', 'Unreal Engine', '#111111', 'unreal-logo'),
('tag-mcp', 'MCP', '#0055ff', 'network'),
('tag-research', 'Research', '#ff9900', 'search'),
('tag-game-dev', 'GameDev', '#00aa88', 'gamepad');

INSERT OR IGNORE INTO item_tags (item_id, tag_id) VALUES
('ki-slime-mechanics', 'tag-unity'),
('ki-slime-mechanics', 'tag-game-dev'),
('ki-factory-dungeon-loop', 'tag-unity'),
('ki-factory-dungeon-loop', 'tag-game-dev'),
('ki-cultivation-systems', 'tag-unreal'),
('ki-cultivation-systems', 'tag-game-dev'),
('ki-unreal-blueprint-agent', 'tag-unreal'),
('ki-unreal-blueprint-agent', 'tag-mcp'),
('ki-unity-aura-architecture', 'tag-unity'),
('ki-unity-aura-architecture', 'tag-mcp'),
('ki-web-analyzers', 'tag-research'),
('ki-web-analyzers', 'tag-mcp');

INSERT OR IGNORE INTO project_knowledge_links (id, project_id, item_id, relation_type) VALUES
('pkl-1', 'proj-slime-evo', 'ki-slime-mechanics', 'requirement'),
('pkl-2', 'proj-factory-dungeon', 'ki-factory-dungeon-loop', 'requirement'),
('pkl-3', 'proj-immortal-cultivation', 'ki-cultivation-systems', 'requirement'),
('pkl-4', 'proj-aura-unity', 'ki-unity-aura-architecture', 'implementation'),
('pkl-5', 'proj-aura-unity', 'ki-unreal-blueprint-agent', 'reference'),
('pkl-6', 'proj-aura-unity', 'ki-web-analyzers', 'requirement');

INSERT OR IGNORE INTO knowledge_relations (id, from_item_id, to_item_id, relation_type, notes) VALUES
('kr-1', 'ki-unreal-blueprint-agent', 'ki-unity-aura-architecture', 'extends', 'La investigacion de Aura inspira la arquitectura en Unity.'),
('kr-2', 'ki-web-analyzers', 'ki-universal-attachments', 'requires', 'Los analizadores deben aceptar adjuntos y enlaces web.'),
('kr-3', 'ki-knowledge-modal-pdf', 'ki-universal-attachments', 'related', 'El modal consume y presenta contenido adjunto normalizado.');

INSERT OR IGNORE INTO analyses (id, item_id, source_type, source_ref, summary, insights_json) VALUES
('an-1', 'ki-slime-mechanics', 'manual', 'brainstorm-2026-02-16', 'Concepto base con progresion por absorcion y ramas de evolucion.', '["Mecanica central clara","Necesita balance de crecimiento","Definir limites de tamaño"]'),
('an-2', 'ki-universal-attachments', 'manual', 'notes-attachments', 'Lista de tipos de archivo a soportar y necesidad de pipeline de parseo.', '["Separar metadatos por tipo","OCR para imagenes","Transcripcion para video/audio"]');

-- Agregar columna escalation_message a la tabla tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS escalation_message TEXT DEFAULT '¡Entendido! He notificado a un agente humano para que te atienda. Por favor espera, alguien se pondrá en contacto contigo pronto. ¿Hay algo más en lo que pueda ayudarte mientras esperas?';

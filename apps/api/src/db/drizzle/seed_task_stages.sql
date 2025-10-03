-- Insert default task stages
INSERT INTO task_stages (name, "order", organization_id) VALUES 
('To Do', 0, NULL),
('In Progress', 1, NULL),
('Done', 2, NULL)
ON CONFLICT DO NOTHING;
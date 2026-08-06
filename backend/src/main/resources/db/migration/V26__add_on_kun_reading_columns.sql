-- V26: Add on_reading and kun_reading columns to vocabulary table
ALTER TABLE vocabulary ADD COLUMN on_reading VARCHAR(255);
ALTER TABLE vocabulary ADD COLUMN kun_reading VARCHAR(255);

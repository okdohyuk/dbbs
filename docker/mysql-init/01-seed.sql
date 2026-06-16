-- Seed for the demo backup source (database `test` on mysql-a).
-- Provides tables + data + a view + a stored procedure so snapshot option
-- mapping (schema-only / data-only / routines) can be verified end-to-end.

CREATE TABLE IF NOT EXISTS customers (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  name    VARCHAR(120) NOT NULL,
  email   VARCHAR(190) NOT NULL UNIQUE,
  created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS orders (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  total       DECIMAL(10,2) NOT NULL DEFAULT 0,
  placed      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO customers (name, email) VALUES
  ('Ada Lovelace',   'ada@example.com'),
  ('Alan Turing',    'alan@example.com'),
  ('Grace Hopper',   'grace@example.com');

INSERT INTO orders (customer_id, total) VALUES
  (1, 120.50),
  (1, 80.00),
  (2, 42.00),
  (3, 999.99);

CREATE OR REPLACE VIEW customer_order_totals AS
  SELECT c.id, c.name, COALESCE(SUM(o.total), 0) AS lifetime_total
  FROM customers c
  LEFT JOIN orders o ON o.customer_id = c.id
  GROUP BY c.id, c.name;

DELIMITER //
CREATE PROCEDURE add_order(IN p_customer_id INT, IN p_total DECIMAL(10,2))
BEGIN
  INSERT INTO orders (customer_id, total) VALUES (p_customer_id, p_total);
END //
DELIMITER ;

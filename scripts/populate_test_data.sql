INSERT INTO `accounts` (`account_id`, `name`, `key`, `secret`, `first_name`, `last_name`, `email`, `spending_quota`, `vm_quota`, `public_key`) VALUES ('621c2362-37c5-4c1c-9f04-7c0371f3f325','Testing Guru','3071629e-17b3-455c-a26a-9034a85153cf','97011238-5ed6-4a2a-983a-66b0d0fb75b5','James','Tester','test@eureka.guru','100.0',10,'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDCmvgVyqViJe32NuEQOW5/JM+PgOJgrcoqACV6TVZ6y4mgKbzFbZFvC5cN5b3ofGLeOHFccmpFPWzYn7QZZnwiF3LwAgNAT89YGlgUXyqjIoVc+k1f5s433FWLoSJgiAcOMcE+FiPOgzkbGjZx7j6Wl0+y6R/czvZxwxK0KVPNSCjViBzr28kMSxPhRHnhQhbEUFRHQk9wNeSszJfQOOJNsh0FHZcBZkVE0ptejTBcvkljAxFqnl7wvfRr00si6amy36gOCO/2yrSwgan6ZSlz7OG6B5AAUB/THtd3Ro16SKgYxhmJoxIyJ/S3m0x1KDRItjjaHcVHmhq+H7QdqZ/l');

INSERT INTO `tiers` (`tier_id`, `price_per_hour_in_cent`, `name`, `memory_gb`, `cpu_count`, `local_disk_gb`, `ssd_disk_gb`, `cloud_storage_gb`)
VALUES
('900c4659-4843-4a3f-8e23-8ed3d98f13aa',5.346,'n1-standard-1',3.75,1,20,0,0),
('2b9dd5c2-4b10-4dc3-bf01-22c378435286',10.691,'n1-standard-2',7.5,2,40,0,0),
('6d50a0f7-8607-4b7c-88ee-1aa8158647bc',21.382,'n1-standard-4',15,4,80,0,0),
('ac1fffbe-f796-431b-9441-3a4a928382cc',33.390,'n1-standard-4-ssd',15,4,0,375,0),
('165a107c-0a57-4cad-8451-23d209e22c58',42.524,'n1-standard-8',30,8,120,0,0),
('28d87bb8-ef9c-4daa-8092-abb00ea95298',54.290,'n1-standard-8-ssd',30,8,0,375,0),
('8c84dcde-03bb-4d94-8f5a-d299ef4aa035',96.090,'n1-standard-16-ssd',60,16,0,375,0),
('7921633e-1cb5-49a0-a4b3-4ea9c2765f2e',179.690,'n1-standard-32-ssd',120,32,0,375,0);

INSERT INTO `machines` (`machine_id`, `name`, `account_id`, `vm_id`, `container_id`, `ssh_port`) VALUES ('86d191cb-72dd-4098-90d5-9c691a93894f', 'machina', '621c2362-37c5-4c1c-9f04-7c0371f3f325', 'machinas-dotted-vim-164110', 'e2894b9c4e7f', '3000');

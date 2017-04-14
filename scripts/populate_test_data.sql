INSERT INTO `accounts` VALUES ('93506318-da47-499e-a6f4-c43bdc1f1eae','Test','Key','Secret');
INSERT INTO `accounts` VALUES ('f197ac60-596e-4365-bd55-7b11d07a4482','Another Account','Key2','Secret2');
INSERT INTO `machines` (`machine_id`, `name`, `account_id`) VALUES ('e3fbb152-909d-489b-a385-2e96d12d77fe', 'machina1', '93506318-da47-499e-a6f4-c43bdc1f1eae');
INSERT INTO `machines` (`machine_id`, `name`, `account_id`) VALUES ('0f89a48f-6fd7-408d-9a8f-f357a38ed880', 'machina2', 'f197ac60-596e-4365-bd55-7b11d07a4482');
INSERT INTO `tasks` (`task_id`, `name`, `status`, `command`, `timestamp_start`, `timestamp_ready`, `timestamp_done`, `tier`, `machine_id`) VALUES
  ('554749e1-b35b-455f-9315-082ae9a3390b','taskd597ccc5-369d-44af-a281-acfe6bb42116','Initializing','/bin/crash/burn mofo.sh','2017-04-06 12:59:58',NULL,NULL,'n1-standard-1','e3fbb152-909d-489b-a385-2e96d12d77fe'),
  ('f11e2e72-6e16-4ad3-a342-e3184e658dd8','task99f53319-7c0b-414a-89dd-3d217e190a28','Initializing','/run/this','2017-04-06 15:31:00',NULL,NULL,'n1-standard-1','e3fbb152-909d-489b-a385-2e96d12d77fe'),
  ('ee0e3ab9-9470-4ca9-91d4-b96585bd6576','task4aeac2b8-3250-4534-82b1-713780010e9a','Done','/run/this/again','2017-04-06 15:30:00','2017-04-06 15:40:00','2017-04-06 15:50:00','n1-standard-1','e3fbb152-909d-489b-a385-2e96d12d77fe');

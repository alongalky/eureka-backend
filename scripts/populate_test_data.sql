INSERT INTO `accounts` VALUES ('eb2e695df97f4b5e83c1074261d3bb3e','Test','Key','Secret');
INSERT INTO `accounts` VALUES ('3a52842fd27f4750a03ff51290a82230','Another Account','Key2','Secret2');
INSERT INTO `machines` (`machine_id`, `name`, `account_id`) VALUES ('3a52842fd27f4750a03ff51290a82230', 'machina1', 'eb2e695df97f4b5e83c1074261d3bb3e');
INSERT INTO `machines` (`machine_id`, `name`, `account_id`) VALUES ('3164d90a560743678a2e2a0c6634bea3', 'machina2', '3a52842fd27f4750a03ff51290a82230');
INSERT INTO `tasks` VALUES 
  ('554749e1-b35b-455f-9315-082ae9a3390b','taskd597ccc5-369d-44af-a281-acfe6bb42116','Initializing','/bin/crash/burn mofo.sh','2017-04-06 12:59:58',NULL,NULL,'normal','3a52842fd27f4750a03ff51290a82230'),
  ('f11e2e72-6e16-4ad3-a342-e3184e658dd8','task99f53319-7c0b-414a-89dd-3d217e190a28','Initializing','/run/this','2017-04-06 15:31:00',NULL,NULL,'normal','3a52842fd27f4750a03ff51290a82230');

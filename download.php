function _Download($f_location, $f_name){
  $file = uniqid() . '.pdf';

  file_put_contents($file,file_get_contents($f_location));

  header('Content-Description: File Transfer');
  header('Content-Type: application/octet-stream');
  header('Content-Length: ' . filesize($file));
  header('Content-Disposition: attachment; filename=' . basename($f_name));

  readfile($file);
}

_Download($_GET['file'], "file.pdf");

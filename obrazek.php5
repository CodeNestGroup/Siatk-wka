<?php
################################ 
# TOKEN BY KACKA kacper(at)webhelp.pl
# http://www.kacka.webhelp.pl/porada,14.html 
# Używaj i rozpowszechniaj jak chcesz, zachowaj jednak tą notkę.         
# Miło by było gdybyś poinformował mnie gdzie skrypt został użyty:)     
# Za wszelkie błędy nie ponoszę odpowiedzialności    
################################ 

session_start();
$_SESSION['obrazek'] = substr(md5(uniqid()),13,5);
$string = $_SESSION['obrazek'];
$s = 100;
$w = 35;
$obr = imagecreatetruecolor($s, $w);
$black = imagecolorallocate($obr, 0, 0, 0);
$white = imagecolorallocate($obr, 246, 249  ,255);
$red = imagecolorallocatealpha($obr, 187, 15, 155, 35);
$green = imagecolorallocatealpha($obr, 0, 200, 10, 50);
$blue = imagecolorallocatealpha($obr, 85, 98, 244, 35);
imagefilledrectangle($obr,0,0, $s, $w, $white);
$font = 'arial.ttf';
imagettftext($obr, 20, 2, 10, 30, $red, $font, substr($string,0,1));
imagettftext($obr, 20, 2, rand(25,32), 30, $blue, $font, substr($string,1,1));
imagettftext($obr, 20, 2, rand(40,50), 30, $green, $font, substr($string,2,3));

for($i=1;$i<300;$i++) { 
$kolor = imagecolorallocate($obr, rand(0,255), rand(0,255), rand(0,255));
imagesetpixel($obr, rand(0,$s), rand(0,$w), $kolor);
} 

//header("Content-type: image/png"); // ? header already send in apache
imagepng($obr);
imagedestroy($obr);

?>
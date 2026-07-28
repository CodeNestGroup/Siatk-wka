<?php
/***************************
 Path
 ****************************/
define('APP_DIR','engine');
define('DIR_ACTIONS','engine/module');
define('DIR_TEMPLATES','engine/templates');
define('DEFAULT_LANG','pl');
define('MAINURL','https://siatkowka.escobb.com.pl');
define('FCKBASE','https://siatkowka.escobb.com.pl/FCKeditor/');
define('ADMIN_FOOTER','engine/templates/layout/admin_footer.tpl');
define('WWW_DIR','/');

define('BENCHMARK','1');
define('ERROR','1');

define('ANN_STEP', 25);
define('MAX_SIZE', 10); //Jeśli ustawimy 5 wyświetli 5 z przodu 5 z tylu + środkowy (razem 11).
/****************************
          Comments config
*****************************/
//DEFINE('ADMIN_COMMENT_STEP','10');
//DEFINE('PUBLIC_COMMENT_STEP', '5');
//DEFINE('COMMENT_MODERATION', false);

/****************************
Photos(Galeria)
*****************************/

DEFINE('GALLERY_DIR','/truegallery/');
define('PHOTO_THUMB_WIDTH','71');
define('PHOTO_THUMB_HEIGHT','53');
define('PHOTO_THUMB_HEIGHT2','53');
define('PHOTO_THUMB_WIDTH2','53');
DEFINE('PHOTO_MTHUMB_WIDTH','664');
DEFINE('PHOTO_MTHUMB_HEIGHT','498');
DEFINE('PHOTO_BTHUMB_WIDTH','1024');
DEFINE('PHOTO_BTHUMB_HEIGHT','768');
DEFINE('ADMIN_PHGAL_STEP','20');
DEFINE('IMAGES_PUBLIC_STEP','9');
/****************************
 Event Images
 *****************************/

DEFINE('ESCCOM_CIMGFILE_MAXSIZE',1048576);

/****************************
 PEAR MySQL Parametry
 *****************************/

define('DB_PHPTYPE','mysql');
define('DB_PROTOCOL','tcp');
define('DB_HOST','localhost');
define('DB_NAME','escobb_siatkowka');
define('DB_USERNAME','escobb_siatkowka');
define('DB_PASSWORD','xkqEkeLt');

/****************************
 Smarty Parametry
 *****************************/

define('SMARTY','engine/lib/smarty/Smarty.class.php');
define('SMARTY_TEMPLATE_DIR',APP_DIR.'/templates/');			 	  // Katalog szablonow
define('SMARTY_COMPILE_DIR',APP_DIR.'/var/templates_c/'); 		// Katalog kompilacji
//define('SMARTY_CONFIG_DIR',APP_DIR.'/smartydir/config/'); 	// Katalog konfiguracji szablonow
define('SMARTY_CACHE_DIR',APP_DIR.'/var/cache/'); 				    // Katalog plik?w cache'u
define('SMARTY_DEBUGGING', false); 							              // Debugowanie
//define('SMARTY_COMPILE_CHECK',TRUE);						            // Sprawdzania kompilacji
define('SMARTY_CACHING', TRUE);								              // Parametr cache'owania wynikow kompilacji
define('SMARTY_FORCE_COMPILE', FALSE);						            // Parametr Force_Compile
define('SMARTY_CACHE_LIFETIME', 3600);							            // Parametr czas zycia pamieci podrecznej

?>

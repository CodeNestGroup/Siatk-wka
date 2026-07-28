<?php

class ModelAndView {

    private $_model;
    private $_view;
    private $_message;
    
    
    public function setMessage($message){
    	$this->_message = $message;
    }
    
    public function getMessage(){
    	return $this->_message;
    } 
        
    public function getModel(){
    	return $this->_model;
    }
    
    public function setModel($model_arr){
    	$this->_model = $model_arr;
    }
    
    public function addToModel($arr_key, $model_value){
    	$this->_model[$arr_key] = $model_value;
    }
    
    public function setView($view){
    	return $this->_view = $view;
    }
    
    public function getView(){
    	return $this->_view;
    }
}

//---------------------------------------------------------------------------------------------

class Lang{
	private static $_langDOM = array();	
	private static $_langSymbol = NULL;
	private static $_domxpath = array();
	
	private function __construct(){}
	
	public static function init(){				
 
		// czy lang jest ze zmiennej get
		if(isset($_GET['lang'])){
				$_GET['lang'] = strtolower($_GET['lang']);
				// czy symbol jezyka poprawny
				if(!preg_match('/[a-z]{2}/',$_GET['lang']))
				throw new Exception();
		
				// czy istnieje plik
				if(file_exists(APP_DIR.'/config/lang/'.$_GET['lang'].'.xml'))
				self::$_langSymbol = $_GET['lang'];				
		}
		
		// czy lang jest w zmiennej sesyjnej
		if(!self::$_langSymbol && isset($_SESSION['lang'])){
				if(!preg_match('/[a-z]{2}/',$_SESSION['lang']))
				throw new Exception();
				self::$_langSymbol = $_SESSION['lang'];	
		}

		// jesli nie ma jezyka zostanie zaladowany domyslny
		if(defined('DEFAULT_LANG') && !self::$_langSymbol){
				if(!preg_match('/[a-z]{2}/',DEFAULT_LANG))
				throw new Exception();	
				self::$_langSymbol = DEFAULT_LANG;
		}

		//zaladowaniu pliku komunikatow xml
		if(!self::$_langDOM['escore'] = @DOMDocument::load(APP_DIR.'/config/lang/'.self::$_langSymbol.'.xml'))
		throw new Exception();		
				
		//obiekt do zapytan xpatch
		self::$_domxpath['escore'] = new DOMXPath(self::$_langDOM['escore']);

		//zapamietanie jezyka w sesji
		$_SESSION['lang'] = self::$_langSymbol; 
		if(isset($_GET['lang'])){
			if(isset($_SERVER['HTTP_REFERER'])){
				header ('Location: '.$_SERVER['HTTP_REFERER']);
				exit;
			}
			else{
				header ('Location: '.MAINURL);
				exit;
			}
		}	
	}
	
	public static function getMessage($module,$message){
		$result = self::$_domxpath[$module]->query('//msg[@label="'.$message.'"]');
		
		//jesli nie znaleziono komunikatu
		if($result->length!=1)return self::$_langDOM[$module]->documentElement->getAttribute('defaultMessage');
		
		//zwrocenie komunikatu
		return $result->item(0)->getAttribute('value');
	}
	
	public static function addLangFile($module){		
		if(file_exists(APP_DIR.'/module/'.$module.'/lang/'.self::$_langSymbol.'.xml')){		
			if(!self::$_langDOM[$module] = @DOMDocument::load(APP_DIR.'/module/'.$module.'/lang/'.self::$_langSymbol.'.xml'))
				throw new Exception();
			}
		else throw new Exception();
		
		//obiekt do zapytan xpatch
		self::$_domxpath[$module] = new DOMXPath(self::$_langDOM[$module]);
	}
	
	public static function isFileLoaded($module){
		if(isset(self::$_langDOM[$module]))
			return true;
		else 
			return false;
	}
}																								
									
//---------------------------------------------------------------------------------------------

class Escore{
	private $_getVars = array();

	private $_postVars = array();

	// tylko jeden obiekt klasy
	private static $_instance = FALSE;
	
	// konstruktor prywatny aby nie stworzyc wiecej niz jednej instancji escore	
	private function __construct(){
   		Lang::init();			
   		DBManager::init();
		
		//Get
		foreach($_GET as $key => $value) {
			if ($value=='') $this->_getVars[$key] = false;
			else $this->_getVars[$key] = $value;
      		$_GET[$key] = NULL; 
			unset($_GET[$key]);
		}
			
		//Post
		foreach($_POST as $key => $value) {
			if ($value=='') $this->_postVars[$key] = false;
			else $this->_postVars[$key] = $value;
			$_POST[$key] = NULL; 
			unset($_POST[$key]);
		}	
	}
	
	public static function getInstance(){
		if(self::$_instance == FALSE){
			self::$_instance = new Escore();
		}
		return self::$_instance;
	}
	
	public function & getPostVars(){
		return $this->_postVars;
	}
	
	public function & getGetVars(){
		return $this->_getVars;
	}
	
	public function getVariable($name,$type){
		switch(strtolower($type)){
			case 'get':
					if (isset($this->_getVars[$name]))
						return $this->_getVars[$name];
					else return NULL;
		    default:
		    		if (isset($this->_postVars[$name]))
						return $this->_postVars[$name];
					else return NULL;
		}
	}

	public function setVariable($name,$type,$value) {
		switch (strtolower($type)) {
			case 'get':
				$this->_getVars[$name] = $value;
				break;
			default:
				$this->_postVars[$name] = $value;
		}
	}
	
	public function callModule($module,$action){
		
		if(!Lang::isFileLoaded($module)){
			Lang::addLangFile($module);
		}
			try {
				$MultiActionController = $module;
				if($MultiActionController != ''){
					// admin or no admin
					if (!isset($_SESSION['admin'])){
						$MultiActionControllerFileName = DIR_ACTIONS.'/'.$MultiActionController.'/public/'.$MultiActionController.'.module.php';
					} else {
						$MultiActionControllerFileName = DIR_ACTIONS.'/'.$MultiActionController.'/admin/'.$MultiActionController.'.adminmodule.php';
					}
					if(file_exists($MultiActionControllerFileName)){
						require_once($MultiActionControllerFileName);
						$MultiActionClassName = $MultiActionController.'MultiActionController';
						$ActionController = new $MultiActionClassName();
						$ActionToRun = $action;
						if($ActionToRun != ''){
							// $met_par[0] - method name;
							$met_par = explode('|',$ActionToRun);
							$MethodName = $met_par[0].'_action';
								if(method_exists($ActionController,$MethodName)){									
									// check if method has param
									if(isset($met_par[1]))
										$mv = $ActionController->$MethodName($met_par[1]);
									else
										$mv = $ActionController->$MethodName();								
									if($mv instanceof ModelAndView){
										if($mv!=NULL){										
											global $smarty;											
											// jedna zmienna w obrebie szablonu
											$smarty->assign($module,$mv->getModel());									
											echo $smarty->fetch($mv->getView());
										}
									}
								else{
										return $mv;	
									}									
								} else { 
									throw new Exception ("Brak akcji '$MethodName' w module '$MultiActionController'!");		
								}
						} else {
							throw new Exception ("Nie podano nazwy akcji do uruchomienia");
						} 
					} else {
						throw new Exception ("Brak pliku '$MultiActionControllerFileName' zawierajĂ„â€¦cego kontroler akcji!");
					}		
				} else {
					throw new Exception ("Nie podano nazwy moduÄąâ€šu");
				}
		} 
		catch (Exception $err){
			print_r($err);
		}	
	}
	//NIEBEZPIECZNA uważać co się z tym robi!
        public function destroy($dir) {                   	
        	$mydir = opendir($dir);
            while(false !== ($file = readdir($mydir))) {        
                if($file != "." && $file != "..") {       
                	chmod($dir.'/'.$file, 0777); 
                    //if(file_exists($dir.'/'.$file)) {
                        //chdir('.');
                        unlink($dir.'/'.$file);
                        //rmdir($dir.'/'.$file) or DIE("couldn't delete $dir$file<br />");
                    //}
                    //else
                    //    unlink($dir.'/'.$file) or DIE("couldn't delete $dir$file<br />");
                }
            }
            closedir($mydir);
            rmdir($dir);
        }
        
	public function generateToken(){
		if(isset($_SESSION['customer'])) return $_SESSION['token'];  // token nie zmienia sie, zeby podczas edycji podglad nie powodowal zmiany token i problemow z edycja; you buster !
		$token = md5(time().'qwerty');
		$_SESSION['token'] = $token; 
		return $token;
	}
}

//---------------------------------------------------------------------------------------------

class AppInterface{
	
	public function callModule($module,$action){
		return Escore::callModule($module,$action);
	}	
	
	public function getGETVariable($varName) {
		$Escore = Escore::getInstance();
		return $Escore->getVariable($varName, 'get');	
	}
	
	public function getPOSTVariable($varName) {
		$Escore = Escore::getInstance();
		return $Escore->getVariable($varName, 'post');	
	}
	
	public function getMessage($module,$message){
		return Lang::getMessage($module,$message);
	}		
	
	public function createEditor($name,$value = NULL,$height = NULL,$width = NULL,$type = NULL){
		require_once(WWW_DIR.'FCKeditor/fckeditor.php');	
		$editor = new FCKeditor($name);
		$editor->BasePath = FCKBASE;
		switch($type){
			case 'Basic': { $editor->ToolbarSet = 'Basic'; } break;
			default: $editor->ToolbarSet = 'Default';
		}		
		// strip po to abu quotow nie dawal, tylke jak magic_quotes_gpc ON
		$editor->Value = stripslashes($value);
		if(is_null($width)) $editor->Width = FCKwidth; else $editor->Width = $width; 
		if(is_null($height)) $editor->Height = FCKheight; else $editor->Height = $height; 
		$editor->Create();
	}
	
	public function isInSmartyArray($array,$value){
		if (!$array) return false;
		foreach ($array as $valueinarray)
			if($valueinarray == $value) return true;
		return false;
	}
	
	public function doesSmartyArrayExist($array){
		if (!$array) return FALSE;
		else return count($array);
	}
	
	public function getCurrentUser(){
		return $_SESSION['admin']['essysus_login'];
	}

	public function getCurrentUserRole(){
		return $_SESSION['admin']['esurole_id'];
	}
	
	public function getLang(){
		return $_SESSION['lang'];
	}
	
	public function convertToURL($str){
		$unPretty = array('/Ä‚Â¤/', '/Ä‚Â¶/', '/Ä‚Ä˝/', '/Ä‚â€ž/', '/Ä‚â€“/', '/Ä‚Ĺ›/', '/Ä‚Ĺş/', 
                          '/Ă„â€¦/', '/Ă„â€ž/', '/Ă„â€ˇ/', '/Ă„â€ /', '/Ă„â„˘/', '/Ă„ďż˝/', '/Äąâ€š/', '/Äąďż˝/' ,'/Äąâ€ž/', '/Äąďż˝/', '/Ä‚Ĺ‚/', '/Ä‚â€ś/', '/Äąâ€ş/', '/ÄąĹˇ/', '/ÄąĹź/', '/ÄąÄ…/', '/ÄąÄ˝/', '/ÄąÂ»/',
                          '/ÄąÂ /','/ÄąËť/','/ÄąË‡/','/ÄąÄľ/','/ÄąÂ¸/','/Äąâ€ť/','/Ä‚ďż˝/','/Ä‚â€š/','/Ă„â€š/','/Ä‚â€ž/','/Ă„Ä…/','/Ä‚â€ˇ/','/Ă„Ĺš/','/Ä‚â€°/','/Ă„ďż˝/','/Ä‚â€ą/','/Ă„Ĺˇ/','/Ä‚Ĺ¤/','/Ä‚Ĺ˝/','/Ă„Ĺ˝/','/Äąďż˝/',
                          '/Äąâ€ˇ/','/Ä‚â€ś/','/Ä‚â€ť/','/Äąďż˝/','/Ä‚â€“/','/Äąďż˝/','/ÄąÂ®/','/Ä‚Ĺˇ/','/ÄąÂ°/','/Ä‚Ĺ›/','/Ä‚ĹĄ/','/Äąâ€˘/','/Ä‚Ë‡/','/Ä‚Ë�/','/Ă„ďż˝/','/Ä‚Â¤/','/Ă„Ĺź/','/Ä‚Â§/','/Ă„Ĺ¤/','/Ä‚Â©/','/Ă„â„˘/',
                          '/Ä‚Â«/','/Ă„â€ş/','/Ä‚Â­/','/Ä‚Â®/','/Ă„Ĺą/','/Äąâ€ž/','/Äąďż˝/','/Ä‚Ĺ‚/','/Ä‚Â´/','/Äąâ€�/','/Ä‚Â¶/','/Äąâ„˘/','/ÄąĹ»/','/Ä‚Ĺź/','/ÄąÂ±/','/Ä‚Ä˝/','/Ä‚Ëť/','/Ă‹â„˘/',
                          '/ÄąË�/','/ÄąĹ�/','/Ă„ďż˝/','/Ă„â€�/','/Ä‚Ĺş/','/Äąâ€™/','/Äąâ€ś/','/Ă„â€ /','/Ă„â€ˇ/','/Ă„Äľ/');

        $pretty   = array('ae', 'oe', 'ue', 'Ae', 'Oe', 'Ue', 'ss', 
                          'a', 'A', 'c', 'C', 'e', 'E', 'l', 'L', 'n', 'N', 'o', 'O', 's', 'S', 'z', 'Z', 'z', 'Z',
                          'S','Z','s','z','Y','A','A','A','A','A','A','C','E','E','E','E','I','I','I','I','N',
                          'O','O','O','O','O','O','U','U','U','U','Y','a','a','a','a','a','a','c','e','e','e',
                          'e','i','i','i','i','n','o','o','o','o','o','o','u','u','u','u','y','y',
                          'TH','th','DH','dh','ss','OE','oe','AE','ae','u');

        $permalink = strtolower(preg_replace($unPretty, $pretty, $str));
        return  str_replace(" ", "_", preg_replace("/[^a-zA-Z0-9 ]/", "", $permalink) );
	}
	
	public function isDefined($pre,$id){
		$const_name = $pre.$id;
		if(defined($const_name)) return constant($const_name); else return FALSE;
	}
	
	public function getCurrentDate(){
		$today = getdate();
		$month_arr = array(NULL,'STYCZEŃ','LUTY','MARZEC','KWIECIEŃ','MAJ','CZERWIEC','LIPIEC','SIERPIEŃ','WRZESIEŃ','PAŹDZIERNIK','LISTOPAD','GRUDZIEŃ'); 
		$month = $month_arr[$today['mon']];
		$day = $today['mday']; 
		$year = $today['year']; 
		return $day.' '.mb_strtolower($month,'UTF-8').' '.$year;  
	}
	
	// przystosowywac pod katem konkretnych serwisow
	public function doesImageExist($what = NULL,$idart = NULL){
		$Escore = Escore::getInstance();
			if(is_null($idart)){
				$id_image = $Escore->getVariable('idcat','get');
				$catalogue = IMAGE_SUBCAT_DIR;

			}
			else {
				$id_image = $idart;
				$catalogue = IMAGE_NEWS_DIR;
			}
			
			if(file_exists($catalogue.$what.$id_image.'.jpg'))
				return TRUE;
			else return FALSE;
	}
	
	public function getQueryStringToPage(){
		$temp = explode('&from=',$_SERVER['QUERY_STRING']);
		return $temp[0];
	}
	
	public function round_to_two($value){
		return number_format(round($value,2),2,'.','');
	}
	
	public function doesSessionVariableSet($var){
		if(isset($_SESSION[$var])) return TRUE;
		else return FALSE;	
	}
	
	public function doesVarIsSet($var){
		if(isset($$var)) return TRUE;
		else return FALSE; 
	}
	
	public function generateToken(){
		return Escore::generateToken();
	}

	public function visitCounter(){
		$nazwa_pliku = "licznik/licznik.txt";
		if (is_readable($nazwa_pliku)){
		   if ($plik = fopen($nazwa_pliku, "r")){
		      $dane = fread($plik, filesize($nazwa_pliku));
		      fclose($plik);
		   }			
		}
		if ($dane !== FALSE)
			if(!isset($_COOKIE['Licz']))
				if (is_writeable($nazwa_pliku)){
		   			if ($plik = fopen($nazwa_pliku, "w")){
		      			$dane++;
		      			if (fwrite($plik, $dane) !== FALSE){setcookie('Licz', "0", time() + 43200,'/');}
			      		fclose($plik);
			     	}
			}
		return $dane;	  					
	}	
}

//---------------------------------------------------------------------------------------------

abstract class object{
    public function __construct($data_array = NULL) {
    	if (!is_array($data_array)) return;
    		foreach ($data_array as $key => $value)
			$this->$key = $value;    
    }
    
    public function get($key){
    	return $this->$key;
    }
    
    public function set($key,$value){
    	if(is_array($value))
    		$this->$key = $value;
    	else    	
    		$this->$key = trim($value);
    }
    
    public function lowerCase($key){
    	return mb_strtolower($this->$key,"UTF-8");
    }	

    public function upperCase($key){
    	return mb_strtoupper($this->$key,"UTF-8");
    }

    public function gethtml($key){
    	$trans_tbl = get_html_translation_table(HTML_ENTITIES);
		$trans_tbl = array_flip($trans_tbl);
		return strtr ($this->$key ,$trans_tbl);
    } 

    public function withoutHTML($key){
		return strip_tags($this->getHTML($key));
    }	    
    
	public function getClean($key){
		$unPretty = array('/Ä‚Â¤/', '/Ä‚Â¶/', '/Ä‚Ä˝/', '/Ä‚â€ž/', '/Ä‚â€“/', '/Ä‚Ĺ›/', '/Ä‚Ĺş/', 
                          '/Ă„â€¦/', '/Ă„â€ž/', '/Ă„â€ˇ/', '/Ă„â€ /', '/Ă„â„˘/', '/Ă„ďż˝/', '/Äąâ€š/', '/Äąďż˝/' ,'/Äąâ€ž/', '/Äąďż˝/', '/Ä‚Ĺ‚/', '/Ä‚â€ś/', '/Äąâ€ş/', '/ÄąĹˇ/', '/ÄąĹź/', '/ÄąÄ…/', '/ÄąÄ˝/', '/ÄąÂ»/',
                          '/ÄąÂ /','/ÄąËť/','/ÄąË‡/','/ÄąÄľ/','/ÄąÂ¸/','/Äąâ€ť/','/Ä‚ďż˝/','/Ä‚â€š/','/Ă„â€š/','/Ä‚â€ž/','/Ă„Ä…/','/Ä‚â€ˇ/','/Ă„Ĺš/','/Ä‚â€°/','/Ă„ďż˝/','/Ä‚â€ą/','/Ă„Ĺˇ/','/Ä‚Ĺ¤/','/Ä‚Ĺ˝/','/Ă„Ĺ˝/','/Äąďż˝/',
                          '/Äąâ€ˇ/','/Ä‚â€ś/','/Ä‚â€ť/','/Äąďż˝/','/Ä‚â€“/','/Äąďż˝/','/ÄąÂ®/','/Ä‚Ĺˇ/','/ÄąÂ°/','/Ä‚Ĺ›/','/Ä‚ĹĄ/','/Äąâ€˘/','/Ä‚Ë‡/','/Ä‚Ë�/','/Ă„ďż˝/','/Ä‚Â¤/','/Ă„Ĺź/','/Ä‚Â§/','/Ă„Ĺ¤/','/Ä‚Â©/','/Ă„â„˘/',
                          '/Ä‚Â«/','/Ă„â€ş/','/Ä‚Â­/','/Ä‚Â®/','/Ă„Ĺą/','/Äąâ€ž/','/Äąďż˝/','/Ä‚Ĺ‚/','/Ä‚Â´/','/Äąâ€�/','/Ä‚Â¶/','/Äąâ„˘/','/ÄąĹ»/','/Ä‚Ĺź/','/ÄąÂ±/','/Ä‚Ä˝/','/Ä‚Ëť/','/Ă‹â„˘/',
                          '/ÄąË�/','/ÄąĹ�/','/Ă„ďż˝/','/Ă„â€�/','/Ä‚Ĺş/','/Äąâ€™/','/Äąâ€ś/','/Ă„â€ /','/Ă„â€ˇ/','/Ă„Äľ/');

        $pretty   = array('ae', 'oe', 'ue', 'Ae', 'Oe', 'Ue', 'ss', 
                          'a', 'A', 'c', 'C', 'e', 'E', 'l', 'L', 'n', 'N', 'o', 'O', 's', 'S', 'z', 'Z', 'z', 'Z',
                          'S','Z','s','z','Y','A','A','A','A','A','A','C','E','E','E','E','I','I','I','I','N',
                          'O','O','O','O','O','O','U','U','U','U','Y','a','a','a','a','a','a','c','e','e','e',
                          'e','i','i','i','i','n','o','o','o','o','o','o','u','u','u','u','y','y',
                          'TH','th','DH','dh','ss','OE','oe','AE','ae','u');

        $text = strtolower(preg_replace($unPretty, $pretty, $this->$key));
        return  str_replace(" ", "_", preg_replace("/[^a-zA-Z0-9 ]/", "", $text) );
	}
	
}

//---------------------------------------------------------------------------------------------

class Validator{
	
	public function isNumeric($tovalid){
		if(is_numeric($tovalid)) return TRUE;
		else return FALSE;
	}
	
	public function isData($date){		
		if(ereg('^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})$', $date, $regs)) {
   			if(checkdate($regs[2],$regs[3],$regs[1])){	
   				return mktime(0,0,0,$regs[2],$regs[3],$regs[1]); 
   			}
   			else{
   				return FALSE;
   			}
		} else {
   			return FALSE;
		}
	}

	public function isEmail($mail){
		$pattern = '/^([a-z0-9])(([-a-z0-9._])*([a-z0-9]))*\@([a-z0-9])'.
				   '(([a-z0-9-])*([a-z0-9]))+' . '(\.([a-z0-9])([-a-z0-9_-])?([a-z0-9])+)+$/i';		
		if(preg_match($pattern, $mail))
			return TRUE;
		else return FALSE;
	}
	
	public function gethtml($str){
    	$trans_tbl = get_html_translation_table(HTML_ENTITIES);
		$trans_tbl = array_flip($trans_tbl);
		return strtr ($str ,$trans_tbl);
    }
    
    public function isNipValid($pNip) {
		if(!empty($pNip)) {
	            $weights = array(6, 5, 7, 2, 3, 4, 5, 6, 7);
	            $nip = preg_replace('/[\s-]/', '', $pNip);
	            $sum = 0;
	            if (strlen($nip) == 10 && is_numeric($nip)) {	 
	                for($i = 0; $i <= 8; $i++) {
	                    $sum += $nip[$i] * $weights[$i];
	                }
	                if ((($sum % 11) % 10) == $nip[9])
	                    return true;
	            }
		}
	    return false;
	}
	
	public function isValidURL($url) { 
 		return preg_match('|^http(s)?://[a-z0-9-]+(.[a-z0-9-]+)*(:[0-9]+)?(/.*)?$|i', $url); 
	} 
	
	public function isInt($mixed){
    	return (preg_match( '/^\d*$/' ,$mixed) == 1);
	}
	
}

class Time{
	
	private function __construct(){}
	
	static public function TimeLeft($timestamp_date){
    	$publishend = self::UnixTime($timestamp_date);
    	$timeleft = $publishend - self::UnixTime(date('Y-m-d H:i:s'));
    	$date['days_left'] = floor($timeleft /(24*60*60));
    	$date['hours_left'] = floor(24*(($timeleft /(24*60*60)) - $date['days_left']));
    	$date['minutes_left'] = floor(60*((24*(($timeleft /(24*60*60)) - $date['days_left']))-$date['hours_left']));
    	return $date;		
	}
	
	//---------------------------------------------------------------------
	
	static public function UnixTime($mysql_timestamp){
	    if (preg_match('/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/', $mysql_timestamp, $pieces)
	        || preg_match('/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/', $mysql_timestamp, $pieces)) {
	            $unix_time = mktime($pieces[4], $pieces[5], $pieces[6], $pieces[2], $pieces[3], $pieces[1]);
	    } elseif (preg_match('/\d{4}\-\d{2}\-\d{2} \d{2}:\d{2}:\d{2}/', $mysql_timestamp)
	        || preg_match('/\d{2}\-\d{2}\-\d{2} \d{2}:\d{2}:\d{2}/', $mysql_timestamp)
	        || preg_match('/\d{4}\-\d{2}\-\d{2}/', $mysql_timestamp)
	        || preg_match('/\d{2}\-\d{2}\-\d{2}/', $mysql_timestamp)) {
	            $unix_time = strtotime($mysql_timestamp);
	    } elseif (preg_match('/(\d{4})(\d{2})(\d{2})/', $mysql_timestamp, $pieces)
	        || preg_match('/(\d{2})(\d{2})(\d{2})/', $mysql_timestamp, $pieces)) {
	            $unix_time = mktime(0, 0, 0, $pieces[2], $pieces[3], $pieces[1]);
	    }
  		return $unix_time;
	}	

}

?>
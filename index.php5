<?php
	/*function log_error( $num, $str, $file, $line, $context = null )
	{
		log_exception( new ErrorException( $str, 0, $num, $file, $line ) );
	}
	function log_exception( Exception $e )
	{
		$message = "Code: {$e->getCode()}; Message: {$e->getMessage()}; File: {$e->getFile()}; Line: {$e->getLine()};";
		file_put_contents( "exceptions.log", $message . PHP_EOL, FILE_APPEND );
	}
	function set_log($string) {
		file_put_contents( "exceptions.log", $string . PHP_EOL, FILE_APPEND );
	}
	set_error_handler( "log_error" );
	set_exception_handler( "log_exception" );
	//---raportowanie błędów--------------------------------------------------------------------------------------------------*/

	ob_start();
	session_start();
	//error_reporting(E_ALL /*& ~E_DEPRECATED*/);
        //error_reporting(E_ALL);
        header("Content-Type: text/html; charset=utf-8");
	require_once("../engine/config/define.conf.php");
        
	//ini_set('display_errors',ERROR);
	ini_set('magic_quotes_gpc',0);
	
	require_once 'Benchmark/Timer.php';
	$timer = new Benchmark_Timer(BENCHMARK);
	
	require_once(APP_DIR."/config/dbmanager.conf.php");
	require_once(APP_DIR."/lib/core/core.class.php");
	require_once("DB.php");
	require_once(SMARTY);
        
	$languages = array('pl');
	// tylko wersja polska bez mozliwosci zmiany
 	//$_SESSION['lang'] = 'pl';
 	
	$timer->setMarker('Do instancji Escora');	

	try {
		$Escore = Escore::getInstance();	
	}
	catch (Exception $EscoreFatalError){
		//print_r($EscoreFatalError);
		if(EXC_SAVE_FILE){
			$plik = fopen(APP_DIR.'/log/exc.txt','a');
			$output = date('Y F jS,H:i')."\nMessage: ".$EscoreFatalError->getMessage()."\nFile: ".$EscoreFatalError->getFile()."\nLine: ".$EscoreFatalError->getLine()."\nCode: ".$EscoreFatalError->getCode()."\nTrace: ".$EscoreFatalError->getTraceAsString()."\n----\n";
			fwrite($plik,$output);
			fclose($plik);
		}
		header('Location: '.MAINURL);
		exit;		
	}
		
	//Interface for smarty
	$smarty = new Smarty();
	$smarty->template_dir = SMARTY_TEMPLATE_DIR;
	$smarty->compile_dir = SMARTY_COMPILE_DIR;
	$smarty->debugging = SMARTY_DEBUGGING;
	$smarty->assign('Interface', new AppInterface());
	$smarty->assign('lang_array', $languages);
	
	$config_array = array();	
	// Czy jest sesja usera
	if (!isset($_SESSION['admin'])) {
		$smarty->assign('fields',$Escore->callModule('system','getFields'));
		$maintpl = 'layout/index.tpl';
		$style = '';
		$config_array['admin_style'] = '';
  	}
	else {
		$maintpl = 'layout/indexadmin.tpl';
		$style = '_admin';
		$config_array['admin_style'] = '_admin';
	}
	
	// ustawia style przy formularzu logowania
	if($Escore->getVariable('module','get')=='users' && $Escore->getVariable('action','get')=='adminmode'){
		$config_array['admin_log_style'] = ' style="background-color: #6a6a6a;height: 1024px;"';
	} else {
		$config_array['admin_log_style'] = '';	
	}
	
	$smarty->assign('config_array',$config_array);

	// chroni przed 'wstecz' zaraz po zalogowaniu
	if(isset($_SESSION['admin']) && $Escore->getVariable('module','get')=='users' && $Escore->getVariable('action','get')=='adminmode'){
		header('Location: '.MAINURL);
		exit;
	}
	
	$timer->setMarker('Przed wywolaniem modulu i akcji');
		try {
				if($Escore->getVariable('module','get') && $Escore->getVariable('action','get')){
				$MultiActionController = $Escore->getVariable('module','get');
				if($MultiActionController != ''){					
					if (!isset($_SESSION['admin'])){
						$MultiActionControllerFileName = DIR_ACTIONS.'/'.$MultiActionController.'/public/'.$MultiActionController.'.module.php';
					} else {
						$MultiActionControllerFileName = DIR_ACTIONS.'/'.$MultiActionController.'/admin/'.$MultiActionController.'.adminmodule.php';
					}
					if(file_exists($MultiActionControllerFileName)){
						if(!Lang::isFileLoaded($MultiActionController)){
							Lang::addLangFile($MultiActionController);
						}
						require_once($MultiActionControllerFileName);
						$MultiActionClassName = $MultiActionController.'MultiActionController';
						$ActionController = new $MultiActionClassName();
						$ActionToRun = $Escore->getVariable('action','get');
						//$ActionToRun = $action; //po co?
						if($ActionToRun != ''){
							$MethodName = $ActionToRun.'_action';
								if(method_exists($ActionController, $MethodName)){									
									$mv = $ActionController->$MethodName();
									if($mv!=NULL){
										// sprawdz czy message jest w URL
										if(!$Escore->getVariable('msg','get')){
											$smarty->assign('message',$mv->getMessage());
										}
										else{
											$smarty->assign('message',Lang::getMessage($MultiActionController,$Escore->getVariable('msg','get')));
										}
										$smarty->assign('escore',$mv->getModel());
										// najwolniejszy kawalek kodu...
										echo $smarty->fetch($mv->getView());	
									}			
								} else { 
									$timer->setMarker('test');
									$smarty->display($maintpl);
									throw new Exception ("Brak akcji '$MethodName' w module '$MultiActionController'!");		
								}
						} else {
							$smarty->display($maintpl);
							throw new Exception ("Nie podano nazwy akcji do uruchomienia");
						} 
					} else {						
						$smarty->display($maintpl);
						throw new Exception ("Brak pliku '$MultiActionControllerFileName' zawierającego kontroler akcji!");
					}		
				} else {
					$smarty->display($maintpl);
					throw new Exception ("Nie podano nazwy modułu");
				}
				} //if
				else{
					$smarty->display($maintpl);
				}
		} 
		catch (Exception $err){
			if(EXC_SAVE_FILE){
				$plik = fopen(APP_DIR.'/log/exc.txt','a');
				$output = date('Y F jS,H:i')."\nMessage: ".$err->getMessage()."\nFile: ".$err->getFile()."\nLine: ".$err->getLine()."\nCode: ".$err->getCode()."\nTrace: ".$err->getTraceAsString()."\n----\n";
				fwrite($plik,$output);
				fclose($plik);
			}
			header('Location: '.MAINURL);
			exit;					
		}

  $timer->setMarker('Po wywolaniem modulu i akcji');

 //echo 'Bufor: '.STD_BUFFERING.' ; Zapytania:'.DBManager::getQueryCounter();
 //	$timer->display();

  $smarty->clear_all_assign();
  ob_end_flush();	
?>	

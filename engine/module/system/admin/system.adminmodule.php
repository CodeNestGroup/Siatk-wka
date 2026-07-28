<?php
	require_once(APP_DIR.'/module/system/systemModel.class.php');
	//require_once(DIR_ACTIONS.'/system/systemModel.class.php');
	require_once('systemModelDaoAdmin.class.php');

	class systemMultiActionController{
		private $_SystemModelDao;
		
		public function __construct(){
			$this->_SystemModelDao = new systemModelDao(); 
		}

                public function getSignOutTime_action(){
                    $result = $this->_SystemModelDao->getSignOutTime();
                    return $result;
                }

                public function getSignUpTime_action(){
                    $result = $this->_SystemModelDao->getSignUpTime();
                    return $result;
                }

                public function getSenderEmail_action(){
                    $result = $this->_SystemModelDao->getSenderEmail();
                    return $result;
                }

                public function getSite_DescTitle_action(){
                    $result = $this->_SystemModelDao->getSite_DescTitle();
                    return $result;
                }

		//-----------------------------------------------------------------------------------
		
		public function phpmybackup_action(){
			$mv = new ModelAndView();
			if($_SESSION['admin']['esurole_id']=='ADMINISTRATOR'){
				$mv->setView('system/phpmybackup.tpl');
				
			}else {
				$mv->setView('layout/error.tpl');	
				$mv->setMessage(Lang::getMessage('system','access_denied'));
			}
			return $mv;
		}
				
		//admin + layout--------------------------------------------------------------------------
		
		public function getMetatag_action(){
			$result_arr = $this->_SystemModelDao->getMetatag();	
			return $result_arr;						
		}		
		
		//admin-------------------------------------------------------------------------------------
	
		public function savemetadata_action(){
			$Escore = Escore::getInstance();
			$mv = new ModelAndView();
			global $languages;
			$metadata = array();
			if($_SESSION['admin']['esurole_id'] == 'ADMINISTRATOR'){
				foreach($Escore->getPostVars() as $key=>$value){
					$exkey = explode('_',$key);
					$metadata[$exkey[2]][$exkey[1]] = $value;					
				}
				// tu lepiej by przeslac obiekt, tyle ze struktura bazy niespojna
				if($this->_SystemModelDao->saveMetaData($metadata)){
					header("Location: ?module=system&action=editmetadata_form&msg=update_successfull");
					exit;
				} else { 
					header("Location: ?module=system&action=editmetadata_form&msg=update_error");
					exit;
				}
				return $mv;
			}
			else {
				$mv->setView('layout/error.tpl');	
				$mv->setMessage(Lang::getMessage('system','access_denied'));
				return $mv;
			}
		}
	
		//admin ustawienia systemowe-------------------------------------------------------

		public function systempref_form_action(){
			$Escore = Escore::getInstance();
			$mv = new ModelAndView();
			if($_SESSION['admin']['esurole_id']=='ADMINISTRATOR'){
				$result_arr = $this->_SystemModelDao->getPreferences();
				foreach($result_arr as $value){
					if($value->get('essys_name') == 'field1')
						$mv->addToModel('field1',$value->get('essys_content'));
					elseif($value->get('essys_name') == 'field2')
						$mv->addToModel('field2',$value->get('essys_content'));
					elseif($value->get('essys_name') == 'field3')
						$mv->addToModel('field3',$value->get('essys_content'));
         				elseif($value->get('essys_name') == 'field4')
						$mv->addToModel('field4',$value->get('essys_content'));
            				elseif($value->get('essys_name') == 'field5')
						$mv->addToModel('field5',$value->get('essys_content'));

				}
				$mv->setView('system/system_preferences.tpl');
			}
			else {
				$mv->setView('layout/error.tpl');	
				$mv->setMessage(Lang::getMessage('system','access_denied'));
			}
			return $mv;
		}
					
		//save pref action-----------------------------------------------------------------
		
		public function savepref_action(){
                        $Escore = Escore::getInstance();
			$mv = new ModelAndView();
                        
			if($_SESSION['admin']['esurole_id']=='ADMINISTRATOR'){
				$Escore = Escore::getInstance();
				$system_obj = new SystemModel();
				$mv = new ModelAndView();
				$mv->setView('system/system_preferences.tpl');

                                                $errorflag = 0;

                                $messages = null;

                                if(!Validator::isNumeric($Escore->getVariable('field3','post')))
                                {
                                    $messages[3] = "Wprowadź poprawną wartość numeryczną.";
                                    $errorflag = 1;
                                }
                                if(!Validator::isNumeric($Escore->getVariable('field4','post')))
                                {
                                    $messages[4] = "Wprowadź poprawną wartość numeryczną.";
                                    $errorflag = 1;
                                }
                                if(!Validator::isEmail($Escore->getVariable('field5','post')))
                                {
                                    $messages[5] = "E-mail jest błędny";
                                    $errorflag = 1;
                                }
                                if($errorflag){
                                    $mv->addToModel('messages', $messages);
                                    $mv->addToModel('if_error',$Escore->getPostVars());
                                    return $mv;
                                }

				$system_obj->set('field1',$Escore->getVariable('field1','post'));
				$system_obj->set('field2',$Escore->getVariable('field2','post'));
                                $system_obj->set('field3',$Escore->getVariable('field3','post'));
                                $system_obj->set('field4',$Escore->getVariable('field4','post'));
                                $system_obj->set('field5',$Escore->getVariable('field5','post'));
								
				if($this->_SystemModelDao->savePreferences($system_obj)){
					header("Location: ?module=system&action=systempref_form&msg=update_successfull");
					exit;
				}					
				else {
					header("Location: ?module=system&action=systempref_form&msg=update_error");
					exit;
				}
			} else {
				$mv->setView('layout/error.tpl');	
				$mv->setMessage(Lang::getMessage('system','access_denied'));
			}
			return $mv;	
		}
							
	} // end main class
?>

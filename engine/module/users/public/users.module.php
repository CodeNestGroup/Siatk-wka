<?php
	require_once(APP_DIR.'/module/users/usersModel.class.php');
	require_once("usersModelDao.class.php");
        

	class UsersMultiActionController{
		private $_UsersModelDao;
		public function __construct(){
			$this->_UsersModelDao = new UsersModelDao(); 
		}
		
		//layout-----------------------------------------------------------------------------------
		
		public function login_action(){
			$Escore = Escore::getInstance();
			if(!isset($_SESSION['admin'])){
				if($this->_UsersModelDao->autorizeInDB($Escore->getVariable('login','post'),$Escore->getVariable('password','post'))){
					$result_arr['current_user'] = $this->_UsersModelDao->getUserByLogin($Escore->getVariable('login','post'));
					foreach ($result_arr['current_user'] as $key => $value)
						$_SESSION['admin'][$key] = $value;
                                        if($Escore->getVariable('type','post')){
                                            if($Escore->getVariable('type','post')=='signin' && $Escore->getVariable('matchid','post') != '' ){
                                                    $this->_UsersModelDao->updateUserVars($_SESSION['admin']['essysus_login']);
                                                    $this->_UsersModelDao->signIn($Escore->getVariable('matchid','post'),$Escore->getVariable('login','post'));
                                                    header("Location: ?module=match&action=matchdetails&id=".$Escore->getVariable('matchid','post')."&msg=signinok");
                                                    exit;
                                            }
                                            if($Escore->getVariable('type','post')=='signout' && $Escore->getVariable('matchid','post') != '' ){
                                                    $this->_UsersModelDao->updateUserVars($_SESSION['admin']['essysus_login']);
                                                    $this->_UsersModelDao->signOut($Escore->getVariable('matchid','post'),$Escore->getVariable('login','post'));
                                                    header("Location: ?module=match&action=matchdetails&id=".$Escore->getVariable('matchid','post')."&msg=signoutok");
                                                    exit;
                                            }
                                        }
					// ustaw licznik i ostatnie logowanie i sprawdz czy ustawila sie sesja
					$this->_UsersModelDao->updateUserVars($_SESSION['admin']['essysus_login']);	
					header("Location: ?module=match&action=showmatches");
					exit;							
				}
				else{
                                    if($Escore->getVariable('type','post')!='narmal' && $Escore->getVariable('matchid','post') != '')
                                    {
                                        header("Location: ?module=users&action=adminmode&msg=loginerror&id=".$Escore->getVariable('matchid','post')."&login=".$Escore->getVariable('login','post')."&type=".$Escore->getVariable('type','post'));
					exit;
                                    }
                                    else
                                    {
					header("Location: ?module=users&action=adminmode&msg=loginerror");
					exit;
                                    }
				}
			}
			else{
				$mv = new ModelAndView();
				$mv->setMessage(Lang::getMessage('users','juzzalogowany'));
				$mv->setView('layout/indexadmin.tpl');			
				return $mv;
			}
			
		}
		
		//layout-----------------------------------------------------------------------------------
		
		public function adminmode_action(){
			$mv = new ModelAndView();
			if(!isset($_SESSION['admin'])){
                                $Escore = Escore::getInstance();
                                if($Escore->getVariable('login','get') != '')
                                    $mv->addToModel('login', $Escore->getVariable('login','get'));
                                if($Escore->getVariable('type','get') == ('signin'||'signout' ))
                                    $mv->addToModel('type', $Escore->getVariable('type','get'));
                                if($Escore->getVariable('id','get') != '')
                                    $mv->addToModel ('matchid', $Escore->getVariable('id','get'));

				$mv->setView('layout/loginform.tpl');
			}
			else {
				$mv->setView('layout/indexadmin.tpl');
			}
			return $mv;
		}			
	} //end main class
?>

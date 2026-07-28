<?php
	require_once(APP_DIR.'/module/users/usersModel.class.php');
	require_once('usersModelDaoAdmin.class.php');

	class UsersMultiActionController{
		private $_UsersModelDao;
		public function __construct(){
			$this->_UsersModelDao = new UsersModelDao(); 
		}
		
		//admin-----------------------------------------------------------------------------------
			
		public function login_action(){
			$Escore = Escore::getInstance();
			if(!isset($_SESSION['admin'])){
				if($this->_UsersModelDao->autorizeInDB($Escore->getVariable('login','post'),$Escore->getVariable('password','post'))){
					$result_arr['current_user'] = $this->_UsersModelDao->getUserByLogin($Escore->getVariable('login','post'));
					foreach ($result_arr['current_user'] as $key => $value)
						$_SESSION['admin'][$key] = $value;
					// ustaw licznik i ostatnie logowanie i sprawdz czy ustawila sie sesja
					$this->_UsersModelDao->updateUserVars($_SESSION['admin']['essysus_login']);	
					header("Location: ?");
					exit;							
				}
				else{
					header("Location: ?module=users&action=adminmode&msg=loginerror");
					exit;
				}
			}
			else{
				$mv = new ModelAndView();
				$mv->setMessage(Lang::getMessage('users','juzzalogowany'));
				$mv->setView('layout/indexadmin.tpl');			
				return $mv;
			}
			
		}
		
		//admin-----------------------------------------------------------------------------------
		
		public function logout_action(){
			unset($_SESSION['admin']);
			header("Location: ".MAINURL);
			exit;	
		}
		
		//admin-----------------------------------------------------------------------------------
		
		public function changepass_form_action(){
			$mv = new ModelAndView();
			if(isset($_SESSION['admin'])){					
				$Escore = Escore::getInstance();
				if($_SESSION['admin']['essysus_login']==$Escore->getVariable('login','get'))
					$mv->setView('users/users_changepass.tpl');
				else
					$mv->setView('users/users_changepassnoadmin.tpl');
				$result_arr['essysus_login']=$Escore->getVariable('login','get');
				$mv->setModel($result_arr);
			}
			else {
					$mv->setMessage(Lang::getMessage('system','access_denied'));
					$mv->setView('layout/error.tpl');
			}
			return $mv;
		}
		
		//------------------------------------------------------------------------------------------
			
		public function changepass_action(){
			$mv = new ModelAndView();
			$mv->setView('users/users_changepass.tpl');
			if(isset($_SESSION['admin'])){
				// z bazy musi pobrac tylko jeden wiersz zatem jeden obiekt
				$Escore = Escore::getInstance();
				
				// sprawdz czy wartosci nie sa puste					
				if($Escore->getVariable('users_oldpass','post') && $Escore->getVariable('users_newpass','post') && $Escore->getVariable('users_newpass_repeat','post')){		
					$dbpass = $this->_UsersModelDao->getPassByLogin($_SESSION['admin']['essysus_login']);
					
					//sprawdz zgodnosc hasel
					if ($dbpass == md5($Escore->getVariable('users_oldpass','post'))){
						// sprawdz czy nowe haslo nie krotsze niz 5 znakow
						if(strlen($Escore->getVariable('users_newpass','post'))<5){
							$mv->setMessage(Lang::getMessage('users','too_short_password'));
							$mv->addToModel('if_error',$Escore->getPostVars());
							return $mv;				
						}
						
						//sprawdz czy nowe hasla sa takie same
						if($Escore->getVariable('users_newpass','post') == $Escore->getVariable('users_newpass_repeat','post')){
							
							//jesli update sie powiodl zwroc komunikat
							if($this->_UsersModelDao->updateUserPass($_SESSION['admin']['essysus_login'],$Escore->getVariable('users_newpass','post'))){
								//$mv->setMessage(Lang::getMessage('users','haslo_zostalo_zmienione'));
								header("Location: ?module=users&action=userslist&msg=haslo_zostalo_zmienione");
								exit;
							}
							else{
								$mv->setMessage(Lang::getMessage('users','blad_podczas_zmiany_hasla'));
								$mv->addToModel('if_error',$Escore->getPostVars());
								return $mv;
							}				
						}
						else {
							$mv->setMessage(Lang::getMessage('users','inne_nowe_hasla'));
							$mv->addToModel('if_error',$Escore->getPostVars());
							return $mv;
						}					
					}
					else {
						$mv->setMessage(Lang::getMessage('users','bledne_stare_haslo'));
						$mv->addToModel('if_error',$Escore->getPostVars());
						return $mv;	
					}
				}
				else{
					$mv->setMessage(Lang::getMessage('users','haslo_niepuste'));
					$mv->addToModel('if_error',$Escore->getPostVars());
					return $mv;		
				}
				
				//return $mv;
			}	
			
			else {
					$mv->setMessage(Lang::getMessage('system','access_denied'));
					$mv->setView('layout/error.tpl');
					return $mv;
			}
		}	
		
		//------------------------------------------------------------------------------------------
			
		public function changepassnoadmin_action(){
			$mv = new ModelAndView();
			$mv->setView('users/users_changepassnoadmin.tpl');
			
			if($_SESSION['admin']['esurole_id']=='ADMINISTRATOR'){
				// z bazy musi pobrac tylko jeden wiersz zatem jeden obiekt
				$Escore = Escore::getInstance();
	
				// sprawdz czy wartosci nie sa puste					
				if($Escore->getVariable('users_newpass','post') && $Escore->getVariable('users_newpass_repeat','post')){							
						// sprawdz czy nowe haslo nie krotsze niz 5 znakow
						if(strlen($Escore->getVariable('users_newpass','post'))<5){
							$mv->setMessage(Lang::getMessage('users','too_short_password'));
							$mv->addToModel('if_error',$Escore->getPostVars());
							return $mv;				
						}
						
						//sprawdz czy nowe hasla sa takie same
						if($Escore->getVariable('users_newpass','post') == $Escore->getVariable('users_newpass_repeat','post')){
							
							//jesli update sie powiodl zwroc komunikat
							if($this->_UsersModelDao->updateUserPass($Escore->getVariable('essysus_login','post'),$Escore->getVariable('users_newpass','post'))){
								//$mv->setMessage(Lang::getMessage('users','haslo_zostalo_zmienione'));
								header("Location: ?module=users&action=userslist&msg=haslo_zostalo_zmienione");
								exit;
							}
							else{
								$mv->setMessage(Lang::getMessage('users','blad_podczas_zmiany_hasla'));
								$mv->addToModel('if_error',$Escore->getPostVars());
								return $mv;
							}				
						}
						else {
							$mv->setMessage(Lang::getMessage('users','inne_nowe_hasla'));
							$mv->addToModel('if_error',$Escore->getPostVars());
							return $mv;
						}					
				}
				else{
					$mv->setMessage(Lang::getMessage('users','haslo_niepuste'));
					$mv->addToModel('if_error',$Escore->getPostVars());
					return $mv;		
				}
				
			}	
			
			else {
					$mv->setMessage(Lang::getMessage('system','access_denied'));
					$mv->setView('layout/error.tpl');
					return $mv;
			}
		}	

		//---------------------------------------------------------------------------------
		
		public function adduser_form_action(){
			$mv = new ModelAndView();
			if($_SESSION['admin']['esurole_id']=='ADMINISTRATOR'){					
				$mv->addToModel('role_list',$this->_UsersModelDao->getAllRoles());
				$mv->setView('users/add_user.tpl');
			}
			else {
					$mv->setMessage(Lang::getMessage('system','access_denied'));
					$mv->setView('layout/error.tpl');
			}
			return $mv;
		}
		
		//dodaj usera---------------------------------------------------------------------
		
		public function adduser_action(){
			$mv = new ModelAndView();
			$mv->setView('users/add_user.tpl');
			$mv->addToModel('role_list',$this->_UsersModelDao->getAllRoles());
			if($_SESSION['admin']['esurole_id']=='ADMINISTRATOR'){
				$Escore = Escore::getInstance();
				$user_obj = new usersModel();
				
				//login
				if($Escore->getVariable('essysus_login','post')!= '' ){
					if($this->_UsersModelDao->doesUserLoginNotExist($Escore->getVariable('essysus_login','post')))
						$user_obj->set('essysus_login',trim($Escore->getVariable('essysus_login','post')));
					else {
						$mv->setMessage(Lang::getMessage('users','login_exist'));
						$mv->addToModel('if_error',$Escore->getPostVars());
						return $mv;	
					}
				}
				else {				
					$mv->setMessage(Lang::getMessage('users','login_can_not_be_empty'));				
					$mv->addToModel('if_error',$Escore->getPostVars());
					return $mv;	
				}
			
				//password
				if($Escore->getVariable('essysus_passwd_1','post')!= '' && trim($Escore->getVariable('essysus_passwd_1','post')) == trim($Escore->getVariable('essysus_passwd_2','post'))){
					if(strlen($Escore->getVariable('essysus_passwd_1','post'))>=5)
						$user_obj->set('essysus_passwd',trim($Escore->getVariable('essysus_passwd_1','post')));
					else{
						$mv->setMessage(Lang::getMessage('users','too_short_password'));
						$mv->addToModel('if_error',$Escore->getPostVars());
						return $mv;				
					}
				}
				else { 
					$mv->setMessage(Lang::getMessage('users','wrong_password'));				
					$mv->addToModel('if_error',$Escore->getPostVars());
					return $mv;
				}

				//rola
				if($Escore->getVariable('esurole_id','post')!= '' ){
					$user_obj->set('esurole_id',$Escore->getVariable('esurole_id','post'));
				}
				else {				
					$mv->setMessage(Lang::getMessage('users','choose_user_role'));				
					$mv->addToModel('if_error',$Escore->getPostVars());
					return $mv;	
				}
					
				// opis
				$user_obj->set('essysus_desc',trim($Escore->getVariable('essysus_desc','post')));
				
				// emial
				if($Escore->getVariable('essysus_email','post')!= '' ){
					if(Validator::isEmail($Escore->getVariable('essysus_email','post')))
						$user_obj->set('essysus_email',trim($Escore->getVariable('essysus_email','post')));
					else {
						$mv->setMessage(Lang::getMessage('users','bad_format_of_email'));
						$mv->addToModel('if_error',$Escore->getPostVars());
						return $mv;	
					}
				}
				else {				
					$mv->setMessage(Lang::getMessage('users','email_can_not_be_empty'));				
					$mv->addToModel('if_error',$Escore->getPostVars());
					return $mv;	
				}
				
				// createdate
				$user_obj->set('essysus_createdate',mktime());

				// autosignup
				if(!is_null($Escore->getVariable('essysus_autosignup','post'))){
					$user_obj->set('essysus_autosignup','1');
				} else {
					$user_obj->set('essysus_autosignup','0');
				}

				// active
				if(!is_null($Escore->getVariable('essysus_active','post'))){
					$user_obj->set('essysus_active','1');
				} else { 
					$user_obj->set('essysus_active','0');
				}

				// try save it                               
                                
				if($this->_UsersModelDao->saveUser($user_obj)){
					header("Location: ?module=users&action=userslist&msg=save_succesfull");
					exit;
				} else {
					header("Location: ?module=articles&action=userslist&msg=save_error");
					exit;
				}	
			}
			else {
					$mv->setMessage(Lang::getMessage('system','access_denied'));
					$mv->setView('layout/error.tpl');
			}
			return $mv;
		}
		
		// users list---------------------------------------------------------------------
		
		public function userslist_action(){
			$mv = new ModelAndView();
			if(isset($_SESSION['admin'])){					
				$mv->setView('users/list_user.tpl');
				if($_SESSION['admin']['esurole_id']!='ADMINISTRATOR')
					$result_arr['users_list'] = $this->_UsersModelDao->getOneOrAllUsers($_SESSION['admin']['essysus_login']);
				else
				$result_arr['users_list'] = $this->_UsersModelDao->getOneOrAllUsers();
				$mv->setModel($result_arr);
			}
			else {
					$mv->setMessage(Lang::getMessage('system','access_denied'));
					$mv->setView('layout/error.tpl');
			}
			return $mv;
		}
		
		// edit user form --------------------------------------------------------------
		
		public function edituser_form_action(){
			$mv = new ModelAndView();
			if($_SESSION['admin']['esurole_id']=='ADMINISTRATOR'){
				$Escore = Escore::getInstance();
				// niby lista ale jeden user
                               
				$result_arr['users_list'] = $this->_UsersModelDao->getUserByLogin($Escore->getVariable('login','get'));
				$result_arr['role_list'] = $this->_UsersModelDao->getAllRoles();
				$mv->setModel($result_arr);
				$mv->setView('users/edit_user.tpl');
			} else {
				$mv->setMessage(Lang::getMessage('system','access_denied'));
				$mv->setView('layout/error.tpl');
			}
			return $mv;
		}		
		
		// update user-----------------------------------------------------------------
		
		public function updateuser_action(){
			$mv = new ModelAndView();
			$mv->setView('users/edit_user.tpl');
			$mv->addToModel('role_list',$this->_UsersModelDao->getAllRoles());
			if($_SESSION['admin']['esurole_id']=='ADMINISTRATOR'){
				$Escore = Escore::getInstance();
				$user_obj = new usersModel();
			
				//z pol hidden
				$user_obj->set('essysus_login',trim($Escore->getVariable('essysus_login','post')));
				$user_obj->set('esurole_id',$Escore->getVariable('esurole_id','post'));
				
				//rola
				if($Escore->getVariable('esurole_id','post')!= '' ){
					$user_obj->set('esurole_id',$Escore->getVariable('esurole_id','post'));
				}
				else {				
					$mv->setMessage(Lang::getMessage('users','choose_user_role'));				
					$mv->addToModel('users_list', new usersModel($Escore->getPostVars()));
					return $mv;	
				}
				
				// opis
				$user_obj->set('essysus_desc',trim($Escore->getVariable('essysus_desc','post')));
				
				// email
				if($Escore->getVariable('essysus_email','post')!= '' ){
					if(Validator::isEmail($Escore->getVariable('essysus_email','post')))
						$user_obj->set('essysus_email',trim($Escore->getVariable('essysus_email','post')));
					else {
						$mv->setMessage(Lang::getMessage('users','bad_format_of_email'));
						$mv->addToModel('users_list', new usersModel($Escore->getPostVars()));
						return $mv;	
					}
				}
				else {				
					$mv->setMessage(Lang::getMessage('users','email_can_not_be_empty'));				
					$mv->addToModel('users_list', new usersModel($Escore->getPostVars()));
					return $mv;	
				}

				// autosignup
				if(!is_null($Escore->getVariable('essysus_autosignup','post'))){
					$user_obj->set('essysus_autosignup','1');
				} else {
					$user_obj->set('essysus_autosignup','0');
				}

				// active
				if(!is_null($Escore->getVariable('essysus_active','post'))){
					$user_obj->set('essysus_active','1');
				} else { 
					$user_obj->set('essysus_active','0');
				}

				// try update it
				if($this->_UsersModelDao->updateUser($user_obj)){
					header("Location: ?module=users&action=userslist&msg=update_succesfull");
					exit;
				} else {
					header("Location: ?module=users&action=userslist&msg=update_error");
					exit;
				}	
			}
			else {
					$mv->setMessage(Lang::getMessage('system','access_denied'));
					$mv->setView('layout/error.tpl');
			}
			return $mv;
		}		
		
		// usun usera---------------------------------------------------------------------
		
		public function deluser_action(){
			$mv = new ModelAndView();
			if($_SESSION['admin']['esurole_id']=='ADMINISTRATOR'){
			  $Escore = Escore::getInstance();			  
			  // nie mozna usunac aktualnie zalogowanego usera
			  if($Escore->getVariable('login','get')!=$_SESSION['admin']['essysus_login']){
				if($this->_UsersModelDao->deleteUser($Escore->getVariable('login','get'))){
					header("Location: ?module=users&action=userslist&msg=delete_succesfull");
					exit;
				}
				else {
					header("Location: ?module=users&action=userslist&msg=delete_error");
					exit;
				}
			  }else {
			  	header("Location: ?module=users&action=userslist&msg=cant_delete_yourself");
				exit;
			  }
			} else {
				$mv->setMessage(Lang::getMessage('system','access_denied'));
				$mv->setView('layout/error.tpl');
			}
			return $mv;
		}
		
	public function change_user_active_action(){
			$mv = new ModelAndView();
			$Escore = Escore::getInstance();
			if($_SESSION['admin']['esurole_id']=='ADMINISTRATOR'){					
				if($this->_UsersModelDao->change_user_active($Escore->getVariable('login','get'))){
					header("Location: ".$_SERVER['HTTP_REFERER']);
					exit;
				}else{
					header("Location: ?module=users&action=userslist&msg=change_error");
					exit;
				}
			}
			else {
					$mv->setMessage(Lang::getMessage('system','access_denied'));
					$mv->setView('layout/error.tpl');
			}
			return $mv;			
	}		
		
	} //end main class
?>


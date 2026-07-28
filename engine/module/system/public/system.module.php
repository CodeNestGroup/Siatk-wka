<?php
	require_once(APP_DIR.'/module/system/systemModel.class.php');
	//require_once(DIR_ACTIONS.'/system/systemModel.class.php');
	require_once('systemModelDao.class.php');

	class systemMultiActionController{
		private $_SystemModelDao;
		
		public function __construct(){
			$this->_SystemModelDao = new systemModelDao(); 
		}
		
		//layout-----------------------------------------------------------------------------------

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

		public function getFields_action(){
			$result_arr = $this->_SystemModelDao->getFields();				
			return $result_arr;						
		}
                


		
		
	} // end main class
?>

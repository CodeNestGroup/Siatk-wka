<?php
	require_once(APP_DIR.'/module/menu/menuModel.class.php');
	require_once('menuModelDao.class.php');
	
	class MenuMultiActionController{
		private $_MenuModelDao;
		
		public function __construct(){
			$this->_MenuModelDao = new menuModelDao();
		}

		//-------------------------------------------------------------------------------------
		
		public function getMenu_action($idsec = TOP_MENU){
            $Escore = Escore::getInstance();
			if($this->_MenuModelDao->doesSectionCanBeShowed($idsec))
            	$result_arr = $this->_MenuModelDao->getCategoryListBySectionId($idsec,TRUE,$Escore->getVariable('idcat','get'));
			return $result_arr;
		}	

        //-------------------------------------------------------------------------------------

        public function doesCategoryHasChildren_action(){
            $Escore = Escore::getInstance();
            return $this->_MenuModelDao->hasChildrenAndParentIsNull($Escore->getVariable('idcat','get'));
        }

		//-------------------------------------------------------------------------------------
	
		public function showSubMenu1_action($parId = NULL){
			$Escore = Escore::getInstance();
			$result_arr = array();
			$result_arr = $this->_MenuModelDao->getSubCategory($parId);
			return $result_arr;
		}

                //-------------------------------------------------------------------------------------
                
		public function showSubMenu_action(){
			$Escore = Escore::getInstance();
			$result_arr = array();
			$result_arr = $this->_MenuModelDao->getSubCategory2($Escore->getVariable('idcat','get'));
			return $result_arr;
		}
					
		//-------------------------------------------------------------------------------------

		public function getTopRightMenu_action($idsec = TOP_RIGHT_MENU){
			if($this->_MenuModelDao->doesSectionCanBeShowed($idsec))
				$result_arr = $this->_MenuModelDao->getCategoryListBySectionId($idsec,FALSE);		
			return $result_arr;
		}			
		
		//-------------------------------------------------------------------------------------
		
		public function getFootMenu_action($idsec = FOOT_MENU){
			if($this->_MenuModelDao->doesSectionCanBeShowed($idsec))
				$result_arr = $this->_MenuModelDao->getCategoryListBySectionId($idsec,FALSE);		
			return $result_arr;
		}

		//-------------------------------------------------------------------------------------

		public function showMap_action(){
			$mv = new ModelAndView();
			$menu = array('mainmenu' => TOP_MENU,'rightmenu' => RIGHT_MENU,'othermenu' => OTHER_MENU);
			$result_arr = array();
			foreach($menu as $key => $value){
				if($this->_MenuModelDao->doesSectionCanBeShowed($menu[$key]))
					$result_arr[$key] = $this->_MenuModelDao->getCategoryListBySectionId($menu[$key],TRUE);	
				else $result_arr[$key] = NULL;
			}
			return $result_arr;			
		}		
	} 
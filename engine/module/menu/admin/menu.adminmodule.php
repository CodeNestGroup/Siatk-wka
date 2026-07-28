<?php

class adminMenu {

    private $_module = NULL;
    private $_action = NULL;
    private $_imagepatch = NULL;
    private $_width = '100';
    private $_module_title = NULL;
    private $_action_title = NULL;
    public $_children = array();

    public function __construct() {

    }

    public function setModule($module_name) {
        $this->_module = $module_name;
    }

    public function setAction($action_name) {
        $this->_action = $action_name;
    }

    public function setModuleTitle($module_title) {
        $this->_module_title = $module_title;
    }

    public function setActionTitle($action_title) {
        $this->_action_title = $action_title;
    }

    public function setImage($path) {
        $this->_imagepatch = $path;
    }

    public function setChildren(adminMenu $child) {
        $this->_children [] = $child;
    }

    public function getModule() {
        return $this->_module;
    }

    public function getAction() {
        return $this->_action;
    }

    public function getModuleTitle() {
        return $this->_module_title;
    }

    public function getActionTitle() {
        return $this->_action_title;
    }

    public function getChildren() {
        return $this->_children;
    }

    public function getImage() {
        return $this->_imagepatch;
    }

}

//-----------------------------------------------------------------------------------------------------------

class MenuMultiActionController {

    private $_MenuModelDao;

    /* przy admin menu nie korzysta na razie z DB
      public function __construct(){
      $this->_MenuModelDao = new menuModelDao();
      } */

    public function SiteAdminMenu_action() {

        /*$menu_list = array();

        $user = new adminMenu();
        $user->setModule('users');
        $user->setModuleTitle('Zawodnicy');
        $user->setImage('images/admin/users_icon.jpg');
        $menu_list[] = $user;

        $logout = new adminMenu();
        $logout->setModule('users');
        $logout->setAction('logout');
        $logout->setActionTitle('Wyloguj');
        $user->setChildren($logout);

        $userlist = new adminMenu();
        $userlist->setModule('users');
        $userlist->setAction('userslist');
        $userlist->setActionTitle('Zarządzaj');
        $user->setChildren($userlist);

        $match = new adminMenu();
        $match->setModule('match');
        $match->setModuleTitle("Mecze");
        $match->setImage('images/admin/system_icon.jpg');
        $menu_list[] = $match;

        $matchlist = new adminMenu();
        $matchlist->setModule("match");
        $matchlist->setAction("showmatches");
        $matchlist->setActionTitle("Lista meczy");
        $match->setChildren($matchlist);


        if ($_SESSION['admin']['esurole_id'] == 'ADMINISTRATOR') {


            $addmatch = new adminMenu();
            $addmatch->setModule("match");
            $addmatch->setAction("addmatch");
            $addmatch->setActionTitle("Nowy mecz");
            $match->setChildren($addmatch);
        
            $adduser = new adminMenu();
            $adduser->setModule('users');
            $adduser->setAction('adduser_form');
            $adduser->setActionTitle('Dodaj zawodnika');
            $user->setChildren($adduser);

            $system = new adminMenu();
            $system->setModule('system');
            $system->setModuleTitle('Ustawienia');
            $system->setImage('images/admin/system_icon.jpg');
            $menu_list[] = $system;*/

            /*$metasystem = new adminMenu();
            $metasystem->setAction('editmetadata_form');
            $metasystem->setActionTitle('Edycja metatagów');
            $system->setChildren($metasystem);

            $pref = new adminMenu();
            $pref->setAction('systempref_form');
            $pref->setActionTitle('Opcje');
            $system->setChildren($pref);*/

            /*$phpmybackup = new adminMenu();
            $phpmybackup->setAction('phpmybackup');
            $phpmybackup->setActionTitle('Kopia zapasowa');
            $system->setChildren($phpmybackup);
        }*/

        $Escore = Escore::getInstance();
        $menu_list = $Escore->getVariable('action','get');


        return $menu_list;
    }

    //-----------------------------------------------------------------------------------------------------

    public function showAdminMenu_action() {
        $mv = new ModelAndView();
        $mv->setView('menu/admin_menu.tpl');
        $mv->setModel($this->SiteAdminMenu_action());
        return $mv;
    }

}

?>

<?php
require_once(APP_DIR.'/module/truegallery/truegalleryModel.class.php');
//require_once(APP_DIR.'/module/articles/articlesModel.class.php');
require_once('truegalleryModelDaoAdmin.class.php');

class trueGalleryMultiActionController {
    private $_trueGalleryModelDao;

    public function __construct() {
        $this->_trueGalleryModelDao = new trueGalleryModelDao();
    }

	/* ZDJECIA */
    //-----------------------------------------------------------------------------------------

    public function change_gimg_active_action() {
        $mv = new ModelAndView();
        $Escore = Escore::getInstance();
        if(isset($_SESSION['admin'])) {
            if($this->_trueGalleryModelDao->change_gimg_active($Escore->getVariable('esgimg_id','get'))) {
                header("Location: ".$_SERVER['HTTP_REFERER']);
                exit;
            } else {
                header("Location: ".$_SERVER['HTTP_REFERER']."?module=truegallery&action=showgalleryadmin&msg=change_active_error");
                exit;
            }
        }
        else {
            $mv->setMessage(Lang::getMessage('system','access_denied'));
            $mv->setView('layout/error.tpl');
        }
        return $mv;
    }

    //-----------------------------------------------------------------------------------------

    public function change_file_active_action() {
        $mv = new ModelAndView();
        $Escore = Escore::getInstance();
        if(isset($_SESSION['admin'])) {
            if($this->_trueGalleryModelDao->change_file_active($Escore->getVariable('esfile_id','get'))) {
                header("Location: ".$_SERVER['HTTP_REFERER']);
                exit;
            } else {
                header("Location: ".$_SERVER['HTTP_REFERER']."?module=truegallery&action=showgalleryadmin&msg=change_active_error");
                exit;
            }
        }
        else {
            $mv->setMessage(Lang::getMessage('system','access_denied'));
            $mv->setView('layout/error.tpl');
        }
        return $mv;
    }

    //------------------------------------------------------------------------------------------

    public function delimg_action() {
        $mv = new ModelAndView();
        if(isset($_SESSION['admin'])) {
            $Escore = Escore::getInstance();
            if($esgal_img = $this->_trueGalleryModelDao->delImage($Escore->getVariable('esgimg_id','get'))) {
                unlink(GALLERY_DIR.$esgal_img->get('esgal_id').'/'.$esgal_img->get('esgimg_filename'));
                unlink(GALLERY_DIR.$esgal_img->get('esgal_id').'/med'.$esgal_img->get('esgimg_filename'));
                unlink(GALLERY_DIR.$esgal_img->get('esgal_id').'/'.$esgal_img->get('esgimg_mfilename'));
                header('Location: ?module=truegallery&action=showimageslist&esgal_id='.$esgal_img->get('esgal_id').'&msg=imgdeleted');
                exit;
            }
        } else {
            $mv->setMessage(Lang::getMessage('system','access_denied'));
            $mv->setView('layout/error.tpl');
        }
        return $mv;
    }

    //------------------------------------------------------------------------------------------

    public function delfile_action() {
        $mv = new ModelAndView();
        if(isset($_SESSION['admin'])) {
            $Escore = Escore::getInstance();
            if($esgal_file = $this->_trueGalleryModelDao->delFile($Escore->getVariable('esfile_id','get'))) {
                unlink(FILES_DIR.$esgal_file->get('esgal_id').'/'.$esgal_file->get('esfile_filename'));
                header('Location: ?module=truegallery&action=showfileslist&esgal_id='.$esgal_file->get('esgal_id').'&msg=filedeleted');
                exit;
            }
        } else {
            $mv->setMessage(Lang::getMessage('system','access_denied'));
            $mv->setView('layout/error.tpl');
        }
        return $mv;

    }

    //------------------------------------------------------------------------------------------

    public function editimage_form_action() {
        $mv = new ModelAndView();
        if(isset($_SESSION['admin'])) {
            $Escore = Escore::getInstance();

            if((ESCCOM_CIMGFILE_MAXSIZE/1024)/1024 >= 1) {
                $mv->addToModel('max_img_size',round(((ESCCOM_CIMGFILE_MAXSIZE/1024)/1024),2).' MB');
            }else {
                $mv->addToModel('max_img_size',floor((ESCCOM_CIMGFILE_MAXSIZE/1024)).'KB');
            }

            $mv->setView('truegallery/edit_image.tpl');
            $mv->addToModel('esgal_name', $this->_trueGalleryModelDao->getCompanyNameById($Escore->getVariable('esgal_id','get')));
            $mv->addToModel('default',$this->_trueGalleryModelDao->getImageById($Escore->getVariable('esgimg_id','get')));
        } else {
            $mv->setMessage(Lang::getMessage('system','access_denied'));
            $mv->setView('layout/error.tpl');
        }
        return $mv;
    }

    //----------------------------------------------------------------------------------------

    public function editfile_form_action() {
        $mv = new ModelAndView();
        if(isset($_SESSION['admin'])) {
            $Escore = Escore::getInstance();

            if((ESCCOM_FILESFILE_MAXSIZE/1024)/1024 >= 1) {
                $mv->addToModel('max_file_size',round(((ESCCOM_FILESFILE_MAXSIZE/1024)/1024),2).' MB');
            }else {
                $mv->addToModel('max_file_size',floor((ESCCOM_FILESFILE_MAXSIZE/1024)).'KB');
            }
            $mv->setView('truegallery/edit_files.tpl');
            $mv->addToModel('esgal_name', $this->_trueGalleryModelDao->getGalleryNameById($Escore->getVariable('esgal_id','get')));
            $mv->addToModel('esccom_name', $this->_trueGalleryModelDao->getCompanyNameById($Escore->getVariable('esgal_id','get')));
            $mv->addToModel('default',$this->_trueGalleryModelDao->getFileById($Escore->getVariable('esfile_id','get')));
        } else {
            $mv->setMessage(Lang::getMessage('system','access_denied'));
            $mv->setView('layout/error.tpl');
        }
        return $mv;
    }

    //----------------------------------------------------------------------------------------

    public function editfile_action() {
        $mv = new ModelAndView();
        if(isset($_SESSION['admin'])) {
            $Escore = Escore::getInstance();
            $file_obj = new galFilesModel();

            if((ESCCOM_FILESFILE_MAXSIZE/1024)/1024 >= 1) {
                $mv->addToModel('max_file_size',round(((ESCCOM_FILESFILE_MAXSIZE/1024)/1024),2).' MB');
            }else {
                $mv->addToModel('max_file_size',floor((ESCCOM_FILESFILE_MAXSIZE/1024)).'KB');
            }

            $mv->setView('truegallery/edit_files.tpl');
            $default = $this->_trueGalleryModelDao->getFileById($Escore->getVariable('esfile_id','get'));
            $mv->addToModel('default',$default);

            $file_obj->set('esfile_filename',$default->get('esfile_filename'));

            $file_obj->set('esgal_name',$Escore->getVariable('esgal_name','post'));

            $file_obj->set('esfile_id',$Escore->getVariable('esfile_id','post'));

            $file_obj->set('esgal_id',$Escore->getVariable('esgal_id','post'));

            if(trim($Escore->getVariable('esfile_title','post'))=='') {
                $mv->setMessage('Tytuł nie może być pusty');
                $mv->addToModel('if_error',$Escore->getPostVars());
                return $mv;
            }else {
                $file_obj->set('esfile_title',trim($Escore->getVariable('esfile_title','post')));
            }

            if(trim($Escore->getVariable('esfile_desc','post'))=='') {
                $file_obj->set('esfile_desc',null);
            }else {
                $file_obj->set('esfile_desc',trim($Escore->getVariable('esfile_desc','post')));
            }

            if(!is_null($Escore->getVariable('esfile_active','post'))) {
                $file_obj->set('esfile_active','1');
            } else {
                $file_obj->set('esfile_active','0');
            }

            $esfile_position = trim($Escore->getVariable('esfile_position','post'));
            if($esfile_position=='') {
                $file_obj->set('esfile_position',0);
            }

            if($esfile_position!='')
                if(Validator::isNumeric($esfile_position) && $esfile_position >= 0 ) {
                    $file_obj->set('esfile_position',$esfile_position);
                }else {
                    $mv->setMessage('Podana pozycja musi byc nie ujemną wartością.');
                    $mv->addToModel('if_error',$Escore->getPostVars());
                    return $mv;
                }
            if(!$_FILES['file']['error']==4) {
                if($_FILES['file']) {
                    if($_FILES['file']['type'] == 'video/x-ms-wmv') {
                        $_FILES['file']['name'] = 'file_'.$file_obj->get('esfile_id').'.wmv';
                        $file_obj->set('esfile_filename',$_FILES['file']['name']);
                    }
                    if($_FILES['file']['type'] == 'video/avi') {
                        $_FILES['file']['name'] = 'file_'.$file_obj->get('esfile_id').'.avi';
                        $file_obj->set('esfile_filename',$_FILES['file']['name']);
                    }
                    if($_FILES['file']['type'] == 'video/x-ms-asf') {
                        $_FILES['file']['name'] = 'file_'.$file_obj->get('esfile_id').'.asf';
                        $file_obj->set('esfile_filename',$_FILES['file']['name']);
                    }
                    if($_FILES['file']['type'] == 'application/msword') {
                        $_FILES['file']['name'] = 'file_'.$file_obj->get('esfile_id').'.doc';
                        $file_obj->set('esfile_filename',$_FILES['file']['name']);
                    }
                    if($_FILES['file']['type'] == 'application/zip') {
                        $_FILES['file']['name'] = 'file_'.$file_obj->get('esfile_id').'.zip';
                        $file_obj->set('esfile_filename',$_FILES['file']['name']);
                    }
                    if($_FILES['file']['type'] == 'application/pdf') {
                        $_FILES['file']['name'] = 'file_'.$file_obj->get('esfile_id').'.pdf';
                        $file_obj->set('esfile_filename',$_FILES['file']['name']);
                    }
                    if($_FILES['file']['size'] > ESCCOM_FILESFILE_MAXSIZE) {
                        $mv->setMessage('Twój plik jest zbyt duży.');
                        $mv->addToModel('if_error',$Escore->getPostVars());
                        return $mv;
                    }
                    if($_FILES['file']['type'] != 'video/x-ms-wmv' && $_FILES['file']['type'] != 'video/avi' && $_FILES['file']['type'] != 'video/x-ms-asf' && $_FILES['file']['type'] != 'application/vnd.oasis.opendocument.text' && $_FILES['file']['type']!= 'application/msword' && $_FILES['file']['type']!= 'application/zip' && $_FILES['file']['type']!='application/x-rar' && $_FILES['file']['type'] != 'application/pdf') {
                        $mv->setMessage('Niepoprawny typ pliku. Tylko pliki typu *.wmv *.avi *.asf *.pdf *.zip *.pdf *.doc są dozwolone.');
                        $mv->addToModel('if_error',$Escore->getPostVars());
                        return $mv;
                    }
                }else {
                    $mv->setMessage('Nie wybrano pliku');
                    $mv->addToModel('if_error',$Escore->getPostVars());
                    return $mv;
                }
            }
            if($this->_trueGalleryModelDao->updateFile($file_obj))
                if(!$_FILES['file']['error']==4) {
                    if($_FILES['file']['error']==0)
                        $uploadfile = FILES_DIR.$file_obj->get('esgal_id').'/'. basename($_FILES['file']['name']);
                    if($_FILES['file']['error']==0) {
                        unlink(FILES_DIR.$file_obj->get('esgal_id').'/'.$default->get('esgal_thumb'));
                        if(!move_uploaded_file($_FILES['file']['tmp_name'], $uploadfile)) {
                            throw new Exception('Nie udało się przesłać pliku');
                        }else {
                            chmod($uploadfile, 0644);
                        }
                    }
                }
            header('Location: ?module=truegallery&action=showfileslist&esgal_id='.$Escore->getVariable('esgal_id','post').'&msg=fileupdated');
            exit;
        } else {
            $mv->setMessage(Lang::getMessage('system','access_denied'));
            $mv->setView('layout/error.tpl');
        }
        return $mv;
    }

    //----------------------------------------------------------------------------------------

    public function editimage_action() { /* CHANGED */
        $mv = new ModelAndView();
        if(isset($_SESSION['admin'])) {
            $Escore = Escore::getInstance();
            $img_obj = new trueGalImagesModel();

            if((ESCCOM_CIMGFILE_MAXSIZE/1024)/1024 >= 1) {
                $mv->addToModel('max_img_size',round(((ESCCOM_CIMGFILE_MAXSIZE/1024)/1024),2).' MB');
            }else {
                $mv->addToModel('max_img_size',floor((ESCCOM_CIMGFILE_MAXSIZE/1024)).'KB');
            }

            $mv->addToModel('esgal_name', $this->_trueGalleryModelDao->getCompanyNameById($Escore->getVariable('esgal_id','get')));

            $mv->setView('truegallery/edit_image.tpl');
            $default = $this->_trueGalleryModelDao->getImageById($Escore->getVariable('esgimg_id','get'));

            $img_obj->set('esgimg_filename',$default->get('esgimg_filename'));//nazwa pliku w przypadku jego braku.
            $img_obj->set('esgimg_mfilename',$default->get('esgimg_mfilename'));

            $mv->addToModel('default',$default);

            if($Escore->getVariable('del_img','post')) {
                $this->_trueGalleryModelDao->deleteImage($default);
                header('Location: '.$_SERVER['HTTP_REFERER']);
            }


            $img_obj->set('esgal_name',$Escore->getVariable('esgal_name','post'));
            $img_obj->set('esgimg_id',$Escore->getVariable('esgimg_id','post'));
            $img_obj->set('esgal_id',$Escore->getVariable('esgal_id','post'));

            if(trim($Escore->getVariable('esgimg_desc','post'))=='') {
                $img_obj->set('esgimg_desc',null);
            }else {
                $img_obj->set('esgimg_desc',trim($Escore->getVariable('esgimg_desc','post')));
            }

            if(!is_null($Escore->getVariable('esgimg_active','post'))) {
                $img_obj->set('esgimg_active','1');
            } else {
                $img_obj->set('esgimg_active','0');
            }

            $esgimg_position = trim($Escore->getVariable('esgimg_position','post'));
            if($esgimg_position=='') {
                $img_obj->set('esgimg_position',0);
            }

            if($esgimg_position!='')
                if(Validator::isNumeric($esgimg_position) && $esgimg_position >= 0 ) {
                    $img_obj->set('esgimg_position',$esgimg_position);
                }else {
                    $mv->setMessage('Podana pozycja musi byc nie ujemną wartością.');
                    $mv->addToModel('if_error',$Escore->getPostVars());
                    return $mv;
                }

            if($_FILES['file']['error']==0) {
                if($_FILES['file']['type'] == 'image/jpeg' || $_FILES['file']['type'] == 'image/pjpeg') {
                    $_FILES['file']['name'] = 'img_'.$img_obj->get('esgimg_id').'.jpg';
                    $img_obj->set('esgimg_filename',$_FILES['file']['name']);
                    $img_obj->set('esgimg_mfilename','mimg_'.$img_obj->get('esgimg_id').'.jpg');
                }
                if($_FILES['file']['type'] == 'image/gif') {
                    $_FILES['file']['name'] = 'img_'.$img_obj->get('esgimg_id').'.gif';
                    $img_obj->set('esgimg_filename',$_FILES['file']['name']);
                    $img_obj->set('esgimg_mfilename','mimg_'.$img_obj->get('esgimg_id').'.gif');
                }
                if($_FILES['file']['size'] > ESCCOM_CIMGFILE_MAXSIZE) {
                    $mv->setMessage('Twój plik jest zbyt duży. Maksymalny rozmiar wynosi 1MB.');
                    $mv->addToModel('if_error',$Escore->getPostVars());
                    return $mv;
                }
                if($_FILES['file']['type'] != 'image/jpeg' && $_FILES['file']['type'] != 'image/pjpeg' && $_FILES['file']['type'] != 'image/gif') {
                    $mv->setMessage('Niepoprawny typ pliku. Tylko pliki typu *.jpg i *.gif są dozwolone.');
                    $mv->addToModel('if_error',$Escore->getPostVars());
                    return $mv;
                }
            }else {
                $img_obj->set('esgimg_filename',null);
            }
            $imgSize = getimagesize($_FILES['file']['tmp_name']);
            if($this->_trueGalleryModelDao->updateImage($img_obj))
                if($_FILES['file']['error']==0 && $_FILES['file']['error'] != 4) {
                    $uploadfile = GALLERY_DIR.$img_obj->get('esgal_id').'/'. basename($_FILES['file']['name']);
                    $uploadmediumfile = GALLERY_DIR.$img_obj->get('esgal_id').'/med'. basename($_FILES['file']['name']);
                    $uploadminifile = GALLERY_DIR.$img_obj->get('esgal_id').'/m'. basename($_FILES['file']['name']);

                    unlink(GALLERY_DIR.$img_obj->get('esgal_id').'/'.$default->get('esgimg_filename'));
                    unlink(GALLERY_DIR.$img_obj->get('esgal_id').'/'.$default->get('esgimg_mfilename'));
                    if(!move_uploaded_file($_FILES['file']['tmp_name'], $uploadfile)) {
                        throw new Exception('Nie udało się przesłać pliku');
                    }else {
                        if($imgSize[0] > $imgSize[1]){
                            $this->resizeImage(GALLERY_DIR.$img_obj->get('esgal_id').'/'. basename($_FILES['file']['name']),$uploadfile,PHOTO_BTHUMB_WIDTH,PHOTO_BTHUMB_HEIGHT);
                        }else{
                            $this->resizeImage(GALLERY_DIR.$img_obj->get('esgal_id').'/'. basename($_FILES['file']['name']),$uploadfile,PHOTO_BTHUMB_HEIGHT,PHOTO_BTHUMB_WIDTH);
                        }
                        chmod($uploadfile, 0644);
                        $mediumfile = GALLERY_DIR.$img_obj->get('esgal_id').'/med'. basename($_FILES['file']['name']);
                        if($imgSize[0] > $imgSize[1]){
                            $this->resizeImage(GALLERY_DIR.$img_obj->get('esgal_id').'/'. basename($_FILES['file']['name']),$mediumfile,PHOTO_MTHUMB_WIDTH,PHOTO_MTHUMB_HEIGHT);
                        }else{
                            $this->resizeImage(GALLERY_DIR.$img_obj->get('esgal_id').'/'. basename($_FILES['file']['name']),$mediumfile,PHOTO_MTHUMB_HEIGHT,PHOTO_MTHUMB_WIDTH);
                        }
                        chmod($uploadmediumfile, 0644);
                        $minifile = GALLERY_DIR.$img_obj->get('esgal_id').'/m'. basename($_FILES['file']['name']);
                        if($imgSize[0] > $imgSize[1]){
                            $this->resizeImage(GALLERY_DIR.$img_obj->get('esgal_id').'/'. basename($_FILES['file']['name']),$minifile,PHOTO_THUMB_WIDTH,PHOTO_THUMB_HEIGHT);
                        }else{
                            $this->resizeImage(GALLERY_DIR.$img_obj->get('esgal_id').'/'. basename($_FILES['file']['name']),$minifile,PHOTO_THUMB_HEIGHT,PHOTO_THUMB_WIDTH);
                        }
                        chmod($uploadminifile, 0644);
                    }
                }
            header('refresh: 0; url=?module=truegallery&action=showimageslist&esgal_id='.$Escore->getVariable('esgal_id','post').'&msg=imegeupdated');
            //header('Location: ?module=truegallery&action=showimageslist&esgal_id='.$Escore->getVariable('esgal_id','post').'&msg=imegeupdated');
            exit;
        } else {
            $mv->setMessage(Lang::getMessage('system','access_denied'));
            $mv->setView('layout/error.tpl');
        }
        return $mv;
    }

    //-----------------------------------------------------------------------------------------

    public function showfileslist_action() {
        $mv = new ModelAndView();
        if(isset($_SESSION['admin'])) {
            $Escore = Escore::getInstance();
            $mv->setView('truegallery/list_files.tpl');
            $mv->addToModel('esfile_id', $Escore->getVariable('esgal_id','get'));
            $mv->addToModel('esfile_name', $this->_trueGalleryModelDao->getgalleryNameById($Escore->getVariable('esgal_id','get')));
            $files_list =&  $this->_trueGalleryModelDao->getFiles($Escore->getVariable('esgal_id','get'));
            $mv->addToModel('files_list', $files_list);
            if(empty($files_list)) {
                $mv->setMessage('Nie dodano jeszcze żadnych plików');
            }
        } else {
            $mv->setMessage(Lang::getMessage('system','access_denied'));
            $mv->setView('layout/error.tpl');
        }
        return $mv;
    }

    //-----------------------------------------------------------------------------------------

    public function showimageslist_action() {
        $mv = new ModelAndView();
        if(isset($_SESSION['admin'])) {
            $Escore = Escore::getInstance();
            $mv->setView('truegallery/list_image.tpl');
            $mv->addToModel('esgal_id', $Escore->getVariable('esgal_id','get'));
            $mv->addToModel('esgal_name', $this->_trueGalleryModelDao->getgalleryNameById($Escore->getVariable('esgal_id','get')));
            $images_list =& $this->_trueGalleryModelDao->getImages($Escore->getVariable('esgal_id','get'));
            $mv->addToModel('images_list',$images_list);
            if(empty($images_list)) {
                $mv->setMessage('Do tej galerii nie zostało dodane jeszcze żadne zdjęcie.');
            }
        } else {
            $mv->setMessage(Lang::getMessage('system','access_denied'));
            $mv->setView('layout/error.tpl');
        }
        return $mv;
    }

    //-----------------------------------------------------------------------------------------

    public function addimage_form_action() {
        $mv = new ModelAndView();
        if(isset($_SESSION['admin'])) {
            $Escore = Escore::getInstance();

            if((ESCCOM_CIMGFILE_MAXSIZE/1024)/1024 >= 1) {
                $mv->addToModel('max_img_size',round(((ESCCOM_CIMGFILE_MAXSIZE/1024)/1024),2).' MB');
            }else {
                $mv->addToModel('max_img_size',floor((ESCCOM_CIMGFILE_MAXSIZE/1024)).'KB');
            }

            $mv->addToModel('esgal_name', $this->_trueGalleryModelDao->getGalleryNameById($Escore->getVariable('esgal_id','get')));
            $mv->addToModel('esgal_id',$Escore->getVariable('esgal_id','get'));
            $mv->setView('truegallery/add_image.tpl');
        } else {
            $mv->setMessage(Lang::getMessage('system','access_denied'));
            $mv->setView('layout/error.tpl');
        }
        return $mv;
    }

    //-----------------------------------------------------------------------------------------

    public function addfile_form_action() {
        $mv = new ModelAndView();
        if(isset($_SESSION['admin'])) {
            $Escore = Escore::getInstance();

            if((ESCCOM_FILESFILE_MAXSIZE/1024)/1024 >= 1) {
                $mv->addToModel('max_file_size',round(((ESCCOM_FILESFILE_MAXSIZE/1024)/1024),2).' MB');
            }else {
                $mv->addToModel('max_file_size',floor((ESCCOM_FILESFILE_MAXSIZE/1024)).'KB');
            }

            $mv->addToModel('esgal_name', $this->_trueGalleryModelDao->getGalleryNameById($Escore->getVariable('esgal_id','get')));
            $mv->addToModel('esgal_id',$Escore->getVariable('esgal_id','get'));
            $mv->setView('truegallery/add_files.tpl');
        } else {
            $mv->setMessage(Lang::getMessage('system','access_denied'));
            $mv->setView('layout/error.tpl');
        }
        return $mv;
    }

    //-----------------------------------------------------------------------------------

    public function addfile_action() {
        $mv = new ModelAndView();
        if(isset($_SESSION['admin'])) {
            $Escore = Escore::getInstance();

            if((ESCCOM_FILESFILE_MAXSIZE/1024)/1024 >= 1) {
                $mv->addToModel('max_file_size',round(((ESCCOM_FILESFILE_MAXSIZE/1024)/1024),2).' MB');
            }else {
                $mv->addToModel('max_file_size',floor((ESCCOM_FILESFILE_MAXSIZE/1024)).'KB');
            }

            $mv->setView('truegallery/add_files.tpl');
            $file_obj = new galFilesModel();
            if(trim($Escore->getVariable('esfile_title','post'))=='') {
                $mv->setMessage('Tytuł nie może być pusty');
                $mv->addToModel('if_error',$Escore->getPostVars());
                return $mv;
            }else {
                $file_obj->set('esfile_title',trim($Escore->getVariable('esfile_title','post')));
            }

            $file_obj->set('esgal_name',$Escore->getVariable('esgal_name','post'));
            $esfile_position = trim($Escore->getVariable('esfile_position','post'));

            if($esfile_position == '') {
                $file_obj->set('esfile_position',0);
            }

            if($esfile_position!='') {
                if(Validator::isNumeric($esfile_position) && $esfile_position >= 0 ) {
                    $file_obj->set('esfile_position',$esfile_position);
                }else {
                    $mv->setMessage('Podana pozycja musi byc nie ujemną wartością.');
                    $mv->addToModel('if_error',$Escore->getPostVars());
                    return $mv;
                }
            }else {
                $file_obj->set('esfile_position',0);
            }

            if(!is_null($Escore->getVariable('esfile_active','post'))) {
                $file_obj->set('esfile_active','1');
            } else {
                $file_obj->set('esfile_active','0');
            }

            if(trim($Escore->getVariable('esfile_desc','post'))=='') {
                $file_obj->set('esfile_desc',null);
            }else {
                $file_obj->set('esfile_desc',trim($Escore->getVariable('esfile_desc','post')));
            }

            $file_obj->set('esgal_id',$Escore->getVariable('esgal_id','post'));
            $file_obj->set('esfile_id',DBManager::generateId('es_files','esfile_id'));
            if($_FILES['file']['error']!=4) {
                if($_FILES['file']) {
                    if($_FILES['file']['type'] == 'video/x-ms-wmv') {
                        $_FILES['file']['name'] = 'file_'.$file_obj->get('esfile_id').'.wmv';
                        $file_obj->set('esfile_filename',$_FILES['file']['name']);
                    }
                    if($_FILES['file']['type'] == 'video/avi') {
                        $_FILES['file']['name'] = 'file_'.$file_obj->get('esfile_id').'.avi';
                        $file_obj->set('esfile_filename',$_FILES['file']['name']);
                    }
                    if($_FILES['file']['type'] == 'video/x-ms-asf') {
                        $_FILES['file']['name'] = 'file_'.$file_obj->get('esfile_id').'.asf';
                        $file_obj->set('esfile_filename',$_FILES['file']['name']);
                    }
                    if($_FILES['file']['type'] == 'application/msword') {
                        $_FILES['file']['name'] = 'file_'.$file_obj->get('esfile_id').'.doc';
                        $file_obj->set('esfile_filename',$_FILES['file']['name']);
                    }
                    if($_FILES['file']['type'] == 'application/zip') {
                        $_FILES['file']['name'] = 'file_'.$file_obj->get('esfile_id').'.zip';
                        $file_obj->set('esfile_filename',$_FILES['file']['name']);
                    }
                    if($_FILES['file']['type'] == 'application/pdf') {
                        $_FILES['file']['name'] = 'file_'.$file_obj->get('esfile_id').'.pdf';
                        $file_obj->set('esfile_filename',$_FILES['file']['name']);
                    }
                    if($_FILES['file']['size'] > ESCCOM_FILESFILE_MAXSIZE) {
                        $mv->setMessage('Tw�j plik jest zbyt du�y.');
                        $mv->addToModel('if_error',$Escore->getPostVars());
                        return $mv;
                    }
                    if($_FILES['file']['type'] != 'video/x-ms-wmv' && $_FILES['file']['type'] != 'video/avi' && $_FILES['file']['type'] != 'video/x-ms-asf' && $_FILES['file']['type'] != 'application/vnd.oasis.opendocument.text' && $_FILES['file']['type']!= 'application/msword' && $_FILES['file']['type']!= 'application/zip' && $_FILES['file']['type']!='application/x-rar' && $_FILES['file']['type'] != 'application/pdf') {
                        $mv->setMessage('Niepoprawny typ pliku. Tylko pliki typu *.wmv *.avi *.asf *.doc *.zip *.pdf są dozwolone.');
                        $mv->addToModel('if_error',$Escore->getPostVars());
                        return $mv;
                    }
                }
            }else {
                $mv->setMessage('Nie wybrano pliku');
                $mv->addToModel('if_error',$Escore->getPostVars());
                return $mv;
            }

            if($this->_trueGalleryModelDao->savefile($file_obj)) {
                $uploadfile = FILES_DIR.$file_obj->get('esgal_id').'/'. basename($_FILES['file']['name']);
                if(move_uploaded_file($_FILES['file']['tmp_name'], $uploadfile)) {
                    chmod($uploadfile, 0644);
                }
                header('Location: ?module=truegallery&action=showfileslist&esgal_id='.$file_obj->get('esgal_id').'&msg=newfileadded');
                exit;
            }
        } else {
            $mv->setMessage(Lang::getMessage('system','access_denied'));
            $mv->setView('layout/error.tpl');
        }
        return $mv;
    }

    //-----------------------------------------------------------------------------------

    private function resizeImage($src, $dst, $dstx = NULL,$dsty = NULL) {
        require_once 'phpthumb/ThumbLib.inc.php';
        $thumb = PhpThumbFactory::create($src);
        $thumb->resize($dstx, $dsty)->save($dst);
    }
    //-----------------------------------------------------------------------------------

    public function addimage_action() { /* CHANGED */
        $mv = new ModelAndView();
        if(isset($_SESSION['admin'])) {
            $Escore = Escore::getInstance();

            if((ESCCOM_CIMGFILE_MAXSIZE/1024)/1024 >= 1) {
                $mv->addToModel('max_img_size',round(((ESCCOM_CIMGFILE_MAXSIZE/1024)/1024),2).' MB');
            } else {
                $mv->addToModel('max_img_size',floor((ESCCOM_CIMGFILE_MAXSIZE/1024)).'KB');
            }

            $mv->setView('truegallery/add_image.tpl');
            $img_obj = new trueGalImagesModel();

            $img_obj->set('esgal_name',$Escore->getVariable('esgal_name','post'));

            $esgimg_position = trim($Escore->getVariable('esgimg_position','post'));
            if($esgimg_position == '') {
                $img_obj->set('esgimg_position',0);
            }

            if($esgimg_position!='')
                if(Validator::isNumeric($esgimg_position) && $esgimg_position >= 0 ) {
                    $img_obj->set('esgimg_position',$esgimg_position);
                }else {
                    $mv->setMessage('Podana pozycja musi byc nie ujemną wartością.');
                    $mv->addToModel('if_error',$Escore->getPostVars());
                    return $mv;
                }


            if(!is_null($Escore->getVariable('esgimg_active','post'))) {
                $img_obj->set('esgimg_active','1');
            } else {
                $img_obj->set('esgimg_active','0');
            }

            if(trim($Escore->getVariable('esgimg_desc','post'))=='') {
                $img_obj->set('esgimg_desc',null);
            }else {
                $img_obj->set('esgimg_desc',trim($Escore->getVariable('esgimg_desc','post')));
            }

            $img_obj->set('esgal_id',$Escore->getVariable('esgal_id','post'));
            $img_obj->set('esgimg_id',DBManager::generateId('es_truegalimages','esgimg_id'));

            if($_FILES['file']['error']!=4) {

                if($_FILES['file']) {
                    if($_FILES['file']['type'] == 'image/jpeg' || $_FILES['file']['type'] == 'image/pjpeg') {
                        $_FILES['file']['name'] = 'img_'.$img_obj->get('esgimg_id').'.jpg';
                        $img_obj->set('esgimg_filename',$_FILES['file']['name']);
                        $img_obj->set('esgimg_mfilename','mimg_'.$img_obj->get('esgimg_id').'.jpg');
                    }
                    if($_FILES['file']['type'] == 'image/gif') {
                        $_FILES['file']['name'] = 'img_'.$img_obj->get('esgimg_id').'.gif';
                        $img_obj->set('esgimg_filename',$_FILES['file']['name']);
                        $img_obj->set('esgimg_mfilename','mimg_'.$img_obj->get('esgimg_id').'.gif');
                    }
                    if($_FILES['file']['size'] > ESCCOM_CIMGFILE_MAXSIZE) {
                        $mv->setMessage('Twój plik jest zbyt duży. Maksymalny rozmiar wynosi 1MB.');
                        $mv->addToModel('if_error',$Escore->getPostVars());
                        return $mv;
                    }
                    if($_FILES['file']['type'] != 'image/jpeg' && $_FILES['file']['type'] != 'image/pjpeg' && $_FILES['file']['type'] != 'image/gif' && $_FILES['file']['error']!=4) {
                        $mv->setMessage('Niepoprawny typ pliku. Tylko pliki typu *.jpg i *.gif są dozwolone.');
                        $mv->addToModel('if_error',$Escore->getPostVars());
                        return $mv;
                    }
                }else {
                    $img_obj->set('esgimg_filename',null);
                }
            }else {
                $mv->setMessage('Nie wybrano pliku.');
                $mv->addToModel('if_error',$Escore->getPostVars());
                return $mv;
            }
            $imgSize = getimagesize($_FILES['file']['tmp_name']);

            if($this->_trueGalleryModelDao->saveimg($img_obj)) {
                $uploadfile = GALLERY_DIR.$img_obj->get('esgal_id').'/'. basename($_FILES['file']['name']);
                if(move_uploaded_file($_FILES['file']['tmp_name'], $uploadfile)) {
                    chmod($uploadfile, 0644);
                    if($imgSize[0] > $imgSize[1]){
                        $this->resizeImage(GALLERY_DIR.$img_obj->get('esgal_id').'/'. basename($_FILES['file']['name']),$uploadfile,PHOTO_BTHUMB_WIDTH,PHOTO_BTHUMB_HEIGHT);
                    }else{
                        $this->resizeImage(GALLERY_DIR.$img_obj->get('esgal_id').'/'. basename($_FILES['file']['name']),$uploadfile,PHOTO_BTHUMB_HEIGHT,PHOTO_BTHUMB_WIDTH);
                    }
                    chmod($uploadfile, 0644);

                    $mediumfile = GALLERY_DIR.$img_obj->get('esgal_id').'/med'. basename($_FILES['file']['name']);
                    if($imgSize[0] > $imgSize[1]){
                        $this->resizeImage(GALLERY_DIR.$img_obj->get('esgal_id').'/'. basename($_FILES['file']['name']),$mediumfile,PHOTO_MTHUMB_WIDTH,PHOTO_MTHUMB_HEIGHT);
                    }else{
                        $this->resizeImage(GALLERY_DIR.$img_obj->get('esgal_id').'/'. basename($_FILES['file']['name']),$mediumfile,PHOTO_MTHUMB_HEIGHT,PHOTO_MTHUMB_WIDTH);
                    }
                    chmod($uploadmediumfile, 0644);
                    
                    $minifile = GALLERY_DIR.$img_obj->get('esgal_id').'/m'. basename($_FILES['file']['name']);
                    if($imgSize[0] > $imgSize[1]){
                        $this->resizeImage(GALLERY_DIR.$img_obj->get('esgal_id').'/'. basename($_FILES['file']['name']),$minifile,PHOTO_THUMB_WIDTH,PHOTO_THUMB_HEIGHT);
                    }else{
                        $this->resizeImage(GALLERY_DIR.$img_obj->get('esgal_id').'/'. basename($_FILES['file']['name']),$minifile,PHOTO_THUMB_WIDTH2,PHOTO_THUMB_HEIGHT2);
                    }
                    chmod($minifile, 0644);
                    header('Location: ?module=truegallery&action=showimageslist&esgal_id='.$img_obj->get('esgal_id').'&msg=newimageadded');
                    exit;
                }
            }
        } else {
            $mv->setMessage(Lang::getMessage('system','access_denied'));
            $mv->setView('layout/error.tpl');
        }
        return $mv;
    }

	/* GALERIA */	

    //-------------------------------------------------------------------------------------

    public function delgallery_action() {
        $mv = new ModelAndView();
        if(isset($_SESSION['admin'])) {
            $Escore = Escore::getInstance();
            if($this->_trueGalleryModelDao->doesGalleryHasImages($Escore->getVariable('id','get'))) {
                header('Location: ?module=truegallery&action=showgalleryadmin&msg=galleryhasimages');
                exit;
            }
            $esgal_gallery = $this->_trueGalleryModelDao->deleteGallery($Escore->getVariable('id','get'));
            rmdir(GALLERY_DIR.$esgal_gallery['esgal_id']);
            rmdir(FILES_DIR.$esgal_gallery['esgal_id']);
            header('Location: ?module=truegallery&action=showgalleryadmin');
            exit;
        } else {
            $mv->setMessage(Lang::getMessage('system','access_denied'));
            $mv->setView('layout/error.tpl');
        }
        return $mv;
    }

    //-------------------------------------------------------------------------------------

    public function savegallery_action() {
        $Escore = Escore::getInstance();
        $mv = new ModelAndView();
        $mv->setView('truegallery/add_gallery.tpl');
        if(isset($_SESSION['admin'])) {
            $gal_obj = new trueGalleryModel();
            foreach($Escore->getPostVars() as $key => $value) {
                switch($key) {
                    case 'esgal_desc': {
                            if(trim($value)=='') {
                                $gal_obj->set('esgal_desc',null);
                            }else {
                                $gal_obj->set('esgal_desc',trim($value));
                            }
                        }
                        break;
                    case 'esgal_name': {
                            if(trim($value)!='') {
                                $gal_obj->set('esgal_name',trim($value));
                            } else {
                                $mv->setMessage('Tytu�� nie zosta�� wype�niony');
                                $mv->addToModel('if_error',$Escore->getPostVars());
                                return $mv;
                            }
                        }
                        break;
                    case 'esgal_position': {
                            if(trim($value)=='') {
                                $mv->setMessage('Pozycja nie została wypełniona');
                                $mv->addToModel('if_error',$Escore->getPostVars());
                                return $mv;
                            }
                            if(Validator::isNumeric($value)&& $value >=0 ) {
                                $gal_obj->set('esgal_position',$value);
                            }else {
                                $mv->setMessage('Wartość pozycji musi być liczbą nieujemną.');
                                $mv->addToModel('if_error',$Escore->getPostVars());
                                return $mv;
                            }
                        }
                        break;
            }//switch
            }//foreach

            if($Escore->getVariable('submit_save_article','post')) {

                $gal_obj->set('essysus_login',$_SESSION['admin']['essysus_login']);
                if(!is_null($Escore->getVariable('esgal_active','post'))) {
                    $gal_obj->set('esgal_active','1');
                } else {
                    $gal_obj->set('esgal_active','0');
                }

                //PLIK
                $gal_obj->set('esgal_id',DBManager::generateId('es_gallery','esgal_id'));
                // zapisac mozna tylko wtedy kiedy kliknieto w butona submit (nie w onchange w sekcji)
                if(!$Escore->getVariable('submit_save_article','post')) {
                    $mv->addToModel('if_error',$Escore->getPostVars());
                    return $mv;
                }
                else {
                    if($this->_trueGalleryModelDao->saveGallery($gal_obj)) {
                        mkdir(GALLERY_DIR.$gal_obj->get('esgal_id'),0777);
                        header("Location: ?module=truegallery&action=showgalleryadmin&msg=galleryadded");
                        exit;
                    } else {
                        header("Location: ?module=truegallery&action=showgalleryadmin&msg=save_error");
                        exit;
                    }
                }
            }

        } else {
            $mv->setMessage(Lang::getMessage('system','access_denied'));
            $mv->setView('layout/error.tpl');
        }
        return $mv;
    }

    //-------------------------------------------------------------------------------------

    public function & showarticleadmin_action() {
        $mv = new ModelAndView();
        if(isset($_SESSION['admin'])) {
            $Escore = Escore::getInstance();
            $result_arr['section_list'] = $this->_ArticlesModelDao->getArticlesSection('all');
            if(is_null($Escore->getVariable('essec_id','get'))) {
                $result_arr['category_list'] = NULL;
            } else {
                $result_arr['category_list'] = $this->_trueGalleryModelDao->getCategoryListBySectionId($Escore->getVariable('essec_id','get'));
            }

            if(!is_null($Escore->getVariable('from','get')))
                $fromvalue = $Escore->getVariable('from','get');
            else
                $fromvalue = 0;

            $result_arr['articles_list'] = $this->_trueGalleryModelDao->getAllArticlesAdminMode($Escore->getVariable('essec_id','get'),$Escore->getVariable('escat_id','get'),$Escore->getVariable('orderby','get'),$Escore->getVariable('order','get'),$fromvalue);

            $quantity = $result_arr['articles_list']['num_rows'];
            $result_arr['step'] = ADMIN_GAL_STEP;
            $result_arr['page'] = array();
            if($quantity > ADMIN_GAL_STEP) {
            // wypelnienie full
                for($i=0,$iter=0; $i<$quantity; $i+=ADMIN_GAL_STEP,$iter++) {
                    $result_arr['page'][$i]['from'] = $i+1; 	// zwieksza sie o step
                    $result_arr['page'][$i]['iter'] = $iter+1; 	// zwiekasza sie o 1
                    // pogrubienie czcionki, zeby bylo wiadome na ktorej jest stronie
                    if($fromvalue == $i) {
                        $result_arr['page'][$i]['active'] = TRUE;
                        // ustaw active i next i prev, kiedy nie ma next daj FALSE
                        if($i+ADMIN_GAL_STEP < $quantity)
                            $result_arr['nextfrom'] = $i + ADMIN_GAL_STEP + 1;
                        else $result_arr['nextfrom'] = FALSE;
                        if($i-ADMIN_GAL_STEP >= 0)
                            $result_arr['prevfrom'] = $i - ADMIN_GAL_STEP + 1;
                        else
                            $result_arr['prevfrom'] = FALSE;
                    } else {
                        $result_arr['page'][$i]['active'] = NULL;
                    }
                }
            }

            $result_arr['search_vars'] = $Escore->getGetVars();
            $mv->setModel($result_arr);
            $mv->setView('articles/list_article.tpl');
        } else {
            $mv->setMessage(Lang::getMessage('system','access_denied'));
            $mv->setView('layout/error.tpl');
        }
        return $mv;
    }

    //----------------------------------------------------------------------------------

    public function & showgalleryadmin_action() {
        $mv = new ModelAndView();
        if(isset($_SESSION['admin'])) {
            $Escore = Escore::getInstance();

            if(!is_null($Escore->getVariable('from','get')))
                $fromvalue = $Escore->getVariable('from','get');
            else
                $fromvalue = 0;

            $result_arr['articles_list'] = $this->_trueGalleryModelDao->getAllCompanyAdminMode($Escore->getVariable('essec_id','get'),$Escore->getVariable('escat_id','get'),$Escore->getVariable('orderby','get'),$Escore->getVariable('order','get'),$fromvalue);

            $quantity = $result_arr['articles_list']['num_rows'];
            $result_arr['step'] = ADMIN_GAL_STEP;
            $result_arr['page'] = array();
            if($quantity > ADMIN_GAL_STEP) {
            // wypelnienie full
                for($i=0,$iter=0; $i<$quantity; $i+=ADMIN_GAL_STEP,$iter++) {
                    $result_arr['page'][$i]['from'] = $i+1; 	// zwieksza sie o step
                    $result_arr['page'][$i]['iter'] = $iter+1; 	// zwiekasza sie o 1
                    //pogrubienie czcionki, zeby bylo wiadome na ktorej jest stronie
                    if($fromvalue == $i) {
                        $result_arr['page'][$i]['active'] = TRUE;
                        // ustaw active i next i prev, kiedy nie ma next daj FALSE
                        if($i+ADMIN_GAL_STEP < $quantity)
                            $result_arr['nextfrom'] = $i + ADMIN_GAL_STEP + 1;
                        else $result_arr['nextfrom'] = FALSE;
                        if($i-ADMIN_GAL_STEP >= 0)
                            $result_arr['prevfrom'] = $i - ADMIN_GAL_STEP + 1;
                        else
                            $result_arr['prevfrom'] = FALSE;
                    } else {
                        $result_arr['page'][$i]['active'] = NULL;
                    }
                }
            }

            $result_arr['search_vars'] = $Escore->getGetVars();
            $mv->setModel($result_arr);
            $mv->setView('truegallery/list_gallery.tpl');
        } else {
            $mv->setMessage(Lang::getMessage('system','access_denied'));
            $mv->setView('layout/error.tpl');
        }
        return $mv;
    }

    //------------------------------------------------------------------------------------------

    public function editgallery_form_action() {
        $mv = new ModelAndView();
        if(isset($_SESSION['admin'])) {
            $Escore = Escore::getInstance();

            $result_arr['articles_list'] = $this->_trueGalleryModelDao->getGalleryAdminMode($Escore->getVariable('id','get'),$Escore->getVariable('lg','get'));

            $mv->setModel($result_arr);
            $mv->setView('truegallery/edit_gallery.tpl');

        } else {
            $mv->setMessage(Lang::getMessage('system','access_denied'));
            $mv->setView('layout/error.tpl');
        }
        return $mv;
    }

    //------------------------------------------------------------------------------------------

    public function updategallery_action() {
        $Escore = Escore::getInstance();
        $mv = new ModelAndView();
        $mv->setView('truegallery/edit_gallery2.tpl');
        if(isset($_SESSION['admin'])) {
            $mv->addToModel('lg',$Escore->getVariable('lg','post'));

            $gal_obj = new articlesModel();
            $gal_obj->set('esgal_id',$Escore->getVariable('esgal_id','post'));

            foreach($Escore->getPostVars() as $key => $value) {
                switch($key) {
                    case 'esgal_desc': {
                            if(trim($value)=='') {
                                $gal_obj->set('esgal_desc',null);
                            }else {
                                $gal_obj->set('esgal_desc',trim($value));
                            }
                        }
                        break;
                    case 'esgal_name': {
                            if(trim($value)!='') {
                                $gal_obj->set('esgal_name',trim($value));
                            } else {
                                $mv->setMessage('Tytuł nie został wypełniony');
                                $mv->addToModel('if_error',$Escore->getPostVars());
                                return $mv;
                            }
                        }
                        break;
                    case 'esgal_position': {
                            if(trim($value)=='') {
                                $mv->setMessage('Pozycja nie została wypełniona');
                                $mv->addToModel('if_error',$Escore->getPostVars());
                                return $mv;
                            }
                            if(Validator::isNumeric($value)&& $value >=0 ) {
                                $gal_obj->set('esgal_position',$value);
                            }else {
                                $mv->setMessage('Wartość pozycji musi być liczbą nieujemną.');
                                $mv->addToModel('if_error',$Escore->getPostVars());
                                return $mv;
                            }
                        }
                        break;
            }//switch
            }//foreach
            $gal_obj->set('essysus_login',$_SESSION['admin']['essysus_login']);
            //login
            if(!is_null($Escore->getVariable('esgal_active','post'))) {
                $gal_obj->set('esgal_active','1');
            } else {
                $gal_obj->set('esgal_active','0');
            }
            if(!is_null($Escore->getVariable('submit_edit_company','post'))) {
                if($this->_trueGalleryModelDao->updateGallery($gal_obj)) {
                    header('refresh: 0; url=?module=truegallery&action=editgallery_form&id='.$gal_obj->get('esgal_id').'&lg=pl&msg=update_succesfull');
                    exit;
                }
            }else {
                $mv->addToModel('if_error',$Escore->getPostVars());
                return $mv;
            }

        } else {
            $mv->setMessage(Lang::getMessage('system','access_denied'));
            $mv->setView('layout/error.tpl');
        }
        return $mv;
    }

    //--------------------------------------------------------------------------------

    public function change_gal_active_action() {
        $mv = new ModelAndView();
        $Escore = Escore::getInstance();
        if(isset($_SESSION['admin'])) {
            if($this->_trueGalleryModelDao->change_gal_active($Escore->getVariable('idart','get'))) {
                header("Location: ".$_SERVER['HTTP_REFERER']);
                exit;
            } else {
                header("Location: ".$_SERVER['HTTP_REFERER']."?module=truegallery&action=showgalleryadmin&msg=change_active_error");
                exit;
            }
        }
        else {
            $mv->setMessage(Lang::getMessage('system','access_denied'));
            $mv->setView('layout/error.tpl');
        }
        return $mv;
    }

    //-------------------------------------------------------------------------------

    public function change_gal_priority_action() {
        $mv = new ModelAndView();
        $Escore = Escore::getInstance();
        if(isset($_SESSION['admin'])) {
            if($this->_trueGalleryModelDao->change_gal_priority($Escore->getVariable('idwyd','get'))) {
                header("Location: ".$_SERVER['HTTP_REFERER']);
                exit;
            } else {
                header("Location: ".$_SERVER['HTTP_REFERER']."?module=truegallery&action=showgalleryadmin&msg=change_active_error");
                exit;
            }
        }
        else {
            $mv->setMessage(Lang::getMessage('system','access_denied'));
            $mv->setView('layout/error.tpl');
        }
        return $mv;
    }
}
?>
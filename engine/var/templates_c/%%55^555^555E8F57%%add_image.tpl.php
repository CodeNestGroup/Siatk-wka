<?php /* Smarty version 2.6.17, created on 2011-04-27 07:53:30
         compiled from truegallery/add_image.tpl */ ?>
<?php echo $this->_tpl_vars['Interface']->callModule('menu','showAdminMenu'); ?>

	<script type="text/javascript" src="js/datapicker/datapicker.js"></script>	
	<link rel="stylesheet" href="js/datapicker/datapicker.css" type="text/css" media="screen" />
	<form action="?module=truegallery&amp;action=addimage" name="edit_metadata" method="post" enctype="multipart/form-data">

        <fieldset>
            <legend>
                Dodaj zdjęcie do galerii
            </legend>
            <table cellpadding="5" cellspacing="0" border="0">
                <tr>
                    <td style="width: 120px;">Zdjęcie:<span style="color: red;">*</span></td>
                    <td class="a_inputtext"><input name="file" type="file" id="file" /></td>
                </tr>
                <tr>
                    <td>Opis</td>
                    <td><textarea rows="3" cols="25" name="esgimg_desc"><?php if ($this->_tpl_vars['escore']['if_error']['esgimg_desc']): ?><?php echo $this->_tpl_vars['escore']['if_error']['esgimg_desc']; ?>
<?php else: ?><?php echo $this->_tpl_vars['escore']['esgimg_desc']; ?>
<?php endif; ?></textarea></td>
                </tr>
                <tr>
                    <td colspan="2">
                        Pola oznaczone * są wymagane. Maksymalny rozmiar zdjęcia nie może przekroczyć <?php echo $this->_tpl_vars['escore']['max_img_size']; ?>
.
                    </td>
                </tr>
                <tr>
                    <td colspan="2" style="text-align: center;"><input type="submit" name="submit_save_article" value="Zapisz" /></td>
                </tr>
            </table>
            <input type="hidden" value="1" name="esgimg_active" />
            <input type="hidden" value="00000" name="esgal_id" />
            <input type="hidden" name="esgimg_position" value="0" />
        </fieldset>
        </form>

<?php $_smarty_tpl_vars = $this->_tpl_vars;
$this->_smarty_include(array('smarty_include_tpl_file' => @ADMIN_FOOTER, 'smarty_include_vars' => array()));
$this->_tpl_vars = $_smarty_tpl_vars;
unset($_smarty_tpl_vars);
 ?>
<?php /* Smarty version 2.6.17, created on 2016-08-18 17:48:22
         compiled from system/phpmybackup.tpl */ ?>
<?php echo $this->_tpl_vars['Interface']->callModule('menu','showAdminMenu'); ?>

	<div style="text-align: center; border: none; margin-top: 50px; margin-left: 50px;">
		<iframe src="phpMyBackupPro/index.php" width="99%" height="600px;" frameBorder=0  >Twoja przeglądarka nie akceptuje pływających ramek!</iframe>
	</div>
	
<?php $_smarty_tpl_vars = $this->_tpl_vars;
$this->_smarty_include(array('smarty_include_tpl_file' => @ADMIN_FOOTER, 'smarty_include_vars' => array()));
$this->_tpl_vars = $_smarty_tpl_vars;
unset($_smarty_tpl_vars);
 ?>
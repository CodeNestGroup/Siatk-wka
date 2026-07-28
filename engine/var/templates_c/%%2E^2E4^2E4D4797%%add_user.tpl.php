<?php /* Smarty version 2.6.17, created on 2018-09-17 15:11:52
         compiled from users/add_user.tpl */ ?>
<?php echo $this->_tpl_vars['Interface']->callModule('menu','showAdminMenu'); ?>

<div style="margin-top: 40px"></div>
<form action="?module=users&amp;action=adduser" method="post">
        <fieldset>
        <legend>Dodaj nowego zawodnika</legend>
	<table cellpadding="5" cellspacing="0" border="0">
		<tr><td style="width: 120px">Login:<span style="color: #FF0000">*</span> </td><td><input class="a_inputtext" type="text" name="essysus_login" value="<?php echo $this->_tpl_vars['escore']['if_error']['essysus_login']; ?>
" /></td></tr>
		<tr><td>Hasło:<span style="color: #FF0000">*</span> </td><td><input class="a_inputtext" type="password" name="essysus_passwd_1" value="" /></td></tr>
		<tr><td>Powtórz hasło:<span style="color: #FF0000">*</span> </td><td><input class="a_inputtext" type="password" name="essysus_passwd_2" value="" /></td></tr>	
		<tr><td>Rola:<span style="color: #FF0000">*</span> </td><td><select class="a_select" name="esurole_id">
			<option value="">Wybierz rolę</option>	
			<?php $_from = $this->_tpl_vars['escore']['role_list']; if (!is_array($_from) && !is_object($_from)) { settype($_from, 'array'); }if (count($_from)):
    foreach ($_from as $this->_tpl_vars['role']):
?>
				<?php if ($this->_tpl_vars['role']->esurole_id == $this->_tpl_vars['escore']['if_error']['esurole_id']): ?>
					<option value="<?php echo $this->_tpl_vars['role']->esurole_id; ?>
" selected="selected"><?php echo $this->_tpl_vars['role']->esurole_name; ?>
</option>
				<?php else: ?>
					<option value="<?php echo $this->_tpl_vars['role']->esurole_id; ?>
"><?php echo $this->_tpl_vars['role']->esurole_name; ?>
</option>
				<?php endif; ?>
			<?php endforeach; endif; unset($_from); ?>
			</select></td></tr>
		<tr><td>E-mail:<span style="color: #FF0000">*</span> </td><td><input class="a_inputtext" type="text" name="essysus_email" value="<?php echo $this->_tpl_vars['escore']['if_error']['essysus_email']; ?>
" /></td></tr>
		<tr><td>Opis: </td><td><textarea class="a_inputtextarea" rows="4" cols="43" name="essysus_desc"><?php echo $this->_tpl_vars['escore']['if_error']['essysus_desc']; ?>
</textarea></td></tr>
		<tr><td>Aktywny:</td><td>
			<?php if ($this->_tpl_vars['escore']['if_error']['essysus_active'] != 'on'): ?>
				 <input style="vertical-align: middle" type="checkbox" name="essysus_active" />
			<?php else: ?>
				 <input style="vertical-align: middle" type="checkbox" name="essysus_active" checked="checked" /> 
			<?php endif; ?>
		</td></tr>
                <tr><td></td><td><span style="color: #FF0000">*</span> - pozycje wymagane</td></tr>
                <tr style="text-align: center"><td colspan="2"><input id="submit" type="image" src="images/submit_button.jpg" /></td></tr>
	</table>
        </fieldset>
</form>
<!--<?php $_smarty_tpl_vars = $this->_tpl_vars;
$this->_smarty_include(array('smarty_include_tpl_file' => @ADMIN_FOOTER, 'smarty_include_vars' => array()));
$this->_tpl_vars = $_smarty_tpl_vars;
unset($_smarty_tpl_vars);
 ?>-->
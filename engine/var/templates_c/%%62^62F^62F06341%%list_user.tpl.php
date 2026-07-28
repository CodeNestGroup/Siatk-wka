<?php /* Smarty version 2.6.17, created on 2018-09-17 16:40:54
         compiled from users/list_user.tpl */ ?>
<?php echo $this->_tpl_vars['Interface']->callModule('menu','showAdminMenu'); ?>

<div style="margin-top: 40px"></div>
	<table class="table" border="0" cellspacing="0" cellpadding="5">
		<tr class="table_header">
			<th>Login</th>
			<th>E-mail</th>
			<th>Ostatnie logowanie</th>
			<th>Logowań</th>
			<th>Aktywny</th>
			<th>Operacje</th>
		</tr>
	<?php $_from = $this->_tpl_vars['escore']['users_list']; if (!is_array($_from) && !is_object($_from)) { settype($_from, 'array'); }$this->_foreach['user'] = array('total' => count($_from), 'iteration' => 0);
if ($this->_foreach['user']['total'] > 0):
    foreach ($_from as $this->_tpl_vars['user']):
        $this->_foreach['user']['iteration']++;
?>
		<tr class="table_row" onmouseover="javascript: this.style.backgroundColor='<?php echo @TR_ONMOUSEOVER_COLOR; ?>
'" onmouseout="javascript: this.style.backgroundColor='#F1F1F1'">
			<td <?php if ($this->_tpl_vars['Interface']->getCurrentUser() == $this->_tpl_vars['user']->essysus_login): ?> id="a_if_currentlogged" <?php endif; ?>><?php echo $this->_tpl_vars['user']->essysus_login; ?>
</td>
			<td><?php echo $this->_tpl_vars['user']->essysus_email; ?>
</td>
			<td style="text-align:center"><?php if (! $this->_tpl_vars['user']->convertToDate('essysus_lastlogin','public')): ?> brak logowań <?php else: ?> <?php echo $this->_tpl_vars['user']->convertToDate('essysus_lastlogin','public'); ?>
 <?php endif; ?></td>
			<td style="text-align:center"><?php echo $this->_tpl_vars['user']->essysus_counter; ?>
</td>
			<td style="font-size: 10px;text-align: center;"><?php if (! $this->_tpl_vars['user']->essysus_active): ?><a style="color: #FF0000;text-decoration: none" href="<?php if ($this->_tpl_vars['Interface']->getCurrentUser() == $this->_tpl_vars['user']->essysus_login): ?>javascript: alert('Nie można zmieniać aktywności aktualnie zalogowanego użytkownika!');<?php else: ?>?module=users&amp;action=change_user_active&amp;login=<?php echo $this->_tpl_vars['user']->essysus_login; ?>
<?php endif; ?>">NIE</a><?php else: ?><a style="color: #00FF00;text-decoration: none" href="<?php if ($this->_tpl_vars['Interface']->getCurrentUser() == $this->_tpl_vars['user']->essysus_login): ?>javascript: alert('Nie można zmieniać aktywności aktualnie zalogowanego użytkownika!');<?php else: ?>?module=users&amp;action=change_user_active&amp;login=<?php echo $this->_tpl_vars['user']->essysus_login; ?>
<?php endif; ?>">TAK</a><?php endif; ?></td>			
			<td class="a_action"><?php if ($this->_tpl_vars['Interface']->getCurrentUserRole() == 'ADMINISTRATOR'): ?> <a class="a_edit" href="?module=users&amp;action=edituser_form&amp;login=<?php echo $this->_tpl_vars['user']->essysus_login; ?>
">edytuj</a> | <a onclick="return confirm('Czy napewno usunąć użytkownika: <?php echo $this->_tpl_vars['user']->essysus_login; ?>
 ?')" class="a_delete" href="?module=users&amp;action=deluser&amp;login=<?php echo $this->_tpl_vars['user']->essysus_login; ?>
">usuń</a> |<?php endif; ?> <a class="a_changepass" href="?module=users&amp;action=changepass_form&amp;login=<?php echo $this->_tpl_vars['user']->essysus_login; ?>
">zmiana hasła</a></td>
		</tr>
	<?php endforeach; endif; unset($_from); ?>
	</table>
<!--<?php $_smarty_tpl_vars = $this->_tpl_vars;
$this->_smarty_include(array('smarty_include_tpl_file' => @ADMIN_FOOTER, 'smarty_include_vars' => array()));
$this->_tpl_vars = $_smarty_tpl_vars;
unset($_smarty_tpl_vars);
 ?>-->
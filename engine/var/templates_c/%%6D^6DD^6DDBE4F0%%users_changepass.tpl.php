<?php /* Smarty version 2.6.17, created on 2017-05-03 19:08:29
         compiled from users/users_changepass.tpl */ ?>
<?php echo $this->_tpl_vars['Interface']->callModule('menu','showAdminMenu'); ?>

<div style="margin-top: 40px"></div>
    <fieldset>
        <legend>Zmiana hasła zalogowanego użytkownika</legend>
        <form action="?module=users&amp;action=changepass" method="post">
        <div><input type="hidden" name="essysus_login" value="<?php if ($this->_tpl_vars['Interface']->doesSmartyArrayExist($this->_tpl_vars['escore']['if_error'])): ?> <?php echo $this->_tpl_vars['escore']['if_error']['essysus_login']; ?>
 <?php else: ?> <?php echo $this->_tpl_vars['escore']['essysus_login']; ?>
<?php endif; ?>" /></div>
        <table cellpadding="5" cellspacing="0" border="0">
                        <tr><td style="width: 120px;">Login użytkownika:</td><td><?php if ($this->_tpl_vars['Interface']->doesSmartyArrayExist($this->_tpl_vars['escore']['if_error'])): ?> <?php echo $this->_tpl_vars['escore']['if_error']['essysus_login']; ?>
  <?php else: ?> <?php echo $this->_tpl_vars['escore']['essysus_login']; ?>
<?php endif; ?></td></tr>
                        <tr><td>Stare hasło:</td><td><input class="a_inputtext" type="password" name="users_oldpass" value="" /></td></tr>
                        <tr><td>Nowe hasło:</td><td><input class="a_inputtext" type="password" name="users_newpass" value="" /></td></tr>
                        <tr><td>Powtórz nowe hasło:</td><td><input class="a_inputtext" type="password" name="users_newpass_repeat" value="" /></td></tr>
                        <tr style="text-align: center"><td colspan="2"><input id="submit" type="image" src="images/submit_button.jpg" /></td></tr>
        </table>
        </form>
    </fieldset>
<?php $_smarty_tpl_vars = $this->_tpl_vars;
$this->_smarty_include(array('smarty_include_tpl_file' => @ADMIN_FOOTER, 'smarty_include_vars' => array()));
$this->_tpl_vars = $_smarty_tpl_vars;
unset($_smarty_tpl_vars);
 ?>
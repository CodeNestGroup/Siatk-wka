{ include file="layout/includes/begin_site.tpl" }	
{ literal }
<script type="text/javascript">
// <![CDATA[	
	function show_sub(id,total){
		document.getElementById('div_menu_'+id).style.display='block';
	}
	
	function hide_sub(total){
		for(i=1;i<=total;i++){
			document.getElementById('div_menu_'+i).style.display='none';
		}
	}
	
// ]]>
</script>
{ /literal }
<!-- admin menu begin-->
<div id="outer_container">
    <div id="inner_container">
<div id="header">
    <div id="header_text">Dzisiaj jest: <strong>{ $smarty.now|date_format:"%Y-%m-%d" }</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Jesteś zalogowany jako: <strong>{ $Interface->getCurrentUser() }</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
    <a style="color: red;" href="?module=users&amp;action=logout">wyloguj</a>
    </div>
    <div id="menu" style="padding-top: 123px; margin-left: 50px;">
        <div>
            <div class="men_itm1{if $menu eq 'userslist' || $menu eq 'edituser_form' || $menu eq 'edituser_form'}_b{/if}"><strong><a style="color: white; text-decoration: none; "href="?module=users&action=userslist">Zawodnicy</a></strong></div>
            {if $smarty.session.admin.esurole_id eq 'ADMINISTRATOR'}<div class="men_itm2{if $menu eq 'adduser_form' || $menu eq 'adduser'}_b{/if}"><strong><a style="color: white; text-decoration: none; "href="?module=users&action=adduser_form">Nowy<br />zawodnik</a></strong></div>{/if}
            <div class="men_itm1{if $menu eq 'showmatches' || $menu eq 'matchdetails'}_b{/if}"><strong><a style="color: white; text-decoration: none; "href="?module=match&action=showmatches">Mecze</a></strong></div>
            {if $smarty.session.admin.esurole_id eq 'ADMINISTRATOR'}<div class="men_itm1{if $menu eq 'addmatch'}_b{/if}"><strong><a style="color: white; text-decoration: none; "href="?module=match&action=addmatch">Nowy mecz</a></strong></div>{/if}
            <div class="men_itm1{if $menu eq 'showstat'}_b{/if}"><strong><a style="color: white; text-decoration: none; "href="?module=match&action=showstat">Statystyki</a></strong></div>
            <div class="men_itm1{if $menu eq 'showimageslist'}_b{/if}"><strong><a style="color: white; text-decoration: none; "href="galeria.html">Galeria</a></strong></div>
            {if $smarty.session.admin.esurole_id eq 'ADMINISTRATOR'}<div class="men_itm1{if $menu eq 'systempref_form'}_b{/if}"><strong><a style="color: white; text-decoration: none; "href="?module=system&action=systempref_form">Ustawienia</a></strong></div>{/if}
            {if $smarty.session.admin.esurole_id eq 'ADMINISTRATOR'}<div class="men_itm2{if $menu eq 'phpmybackup'}_b{/if}"><strong><a style="color: white; text-decoration: none; "href="?module=system&action=phpmybackup">Kopia<br />zapasowa</a></strong></div>{/if}
        </div>
    </div>
</div>


<!-- przełacznik shop/content tutaj był -->

<div>

</div>
{if $message}
<div style="margin-left: 40px; color: red; text-align: center; margin-top: 40px;">{$message}</div>
{/if}
<!-- admin menu end -->
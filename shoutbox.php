<?php
mysql_connect ("10.0.0.1","siatkowka_sunsac","a21gD83Z"); 
mysql_select_db ("siatkowka_sunsac"); 
mysql_query ("SET NAMES utf8");
if(isset($_POST['wyslij']) && !empty($_POST['login']) && !empty($_POST['tresc']) && !empty($_GET['id_match']))
{
	//Definicja zmiennych
	$name = mysql_real_escape_string(htmlspecialchars($_POST['login']));
	$message = mysql_real_escape_string(htmlspecialchars($_POST['tresc']));
	$date = date('Y-m-d H:i:s');
	$id_match = $_GET['id_match']
 
	//Wykonujemy zapytanie importujące zdefiniowane dane
	mysql_query ("INSERT INTO `shoutbox` (`name`, `id_match`, `message`, `date`) VALUES('$name', '$id_match' ,'$message', '$date')");
 
	//No i przenosimy użytkownika z powrotem do shoutboxa
	header('Location: '.$_SERVER['REQUEST_URI']);
} else {
	//Pobieramy dane z bazy
	$query = mysql_query ("SELECT * FROM `shoutbox` ORDER BY `date` DESC LIMIT 10"); 
 
	//Początek struktury tabeli
	echo '<table>';
 
	//Pętla do wyświetlenia wszystkich wpisów
	while($shout=mysql_fetch_array($query)) { 
	     echo '<tr><td>'
	     .'<b>'.$shout['name'].':</b> ' //wyświetlamy nick
	     .$shout['message'] //wyświetlamy treść
	     .'<br/>'
	     .$shout['date'] //wyświetlamy datę
	     .'</tr></td>';
	}
 
	//Koniec struktury tabeli
	echo '</table>'; 
}
?>
<form action="?" method="POST">
Nick: <input type="text" name="login" maxlength="30">
Treść: <input type="text" name="tresc" maxlength="125">
<button type="submit" name="wyslij">Napisz</button>
</form>

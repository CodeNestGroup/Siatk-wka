function externalLinks() {
 if (!document.getElementsByTagName) return;
 var anchors = document.getElementsByTagName("a");
 for (var i=0; i<anchors.length; i++) {
   var anchor = anchors[i];
   if (anchor.getAttribute("href") &&
       anchor.getAttribute("rel") == "external")
     anchor.target = "_blank";
 }
}
window.onload = externalLinks;

$('input[type="text"]').keypress(function(e) {
  var ENTER_KEY = 13;
  if (e.which === ENTER_KEY){
    e.preventDefault();
  }
});

$(document).ready(function(){
 
	$(".toggle_container").hide(); 
 
	//Przesuwanie okna w górę i dół w zależności od tego czy wtyczka jest włączona czy nie (zwinięta lub nie)
	$("p.trigger").click(function(){
		$(this).toggleClass("active").next().slideToggle("slow");
		return false; //Zapobiega przeskokowi okna, po kliknięciu w kotwicę
	});
 
});

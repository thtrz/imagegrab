'use strict';
const error = new URL(location.href).searchParams.get('error');
if (error) {const element=document.getElementById('help-error');element.textContent='上次操作未完成：'+error.slice(0,500);element.hidden=false;}

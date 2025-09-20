<?php

namespace App\Http\Controllers;

class TodoController extends Controller
{
    public function index(): \Illuminate\View\View
    {
        return view('todo');
    }
}

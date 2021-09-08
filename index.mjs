"use strict";
// https://www.w3schools.com/js/js_strict.asp

import fetch from 'node-fetch';

const breakLine = () => {
    console.log('\n');
}

// 1. For a given array of objects loop trough array and list parameter1 of objects where paremeter2 contains a substring "toDO".
// #parametr1 -> title
// #parametr2 -> description

const arrayTask = () => {
    const listOfTasks = [
        {title: 'Add some basic code', description: 'toDO: You have to add HTML structure'},
        {title: 'Add navbar', description: 'Implement navbar'},
        {title: 'Test navbar', description: 'Test do navbar works correctly'},
        {title: 'Add basic CSS code ', description: 'toDO: You have to add CSS structure'},
        {title: 'Add styles', description: ' You have to add styles'},
        {title: 'Add some basic JS code', description: 'toDO: You have to add JS structure'},
        {title: 'Test whole project', description: 'toDO: You have to check if project works correctly'},
    ]

    const titlesOfToDos = listOfTasks
        .filter(task => task.description.includes('toDO'))
        .map(task => task.title);

    console.log('Filtered tasks: ', titlesOfToDos);
};

// 2. Use Rest call to obtain JSON from API https://gorest.co.in/public/v1/users
// Parse JSON and check if user with ID “101” exists and provide status value.

const apiTask = async () => {
    const response = await fetch('https://gorest.co.in/public/v1/users');
    const body = await response.json();

    const user = body.data.find(user => user.id === 101);

    if (user) {
        console.log('Status of user :', user.status);
    }
};

// 3. Get current date/time and add 40 hours to it. Print resulting date. Check if resulting Date Falls on weekend.

const dateTask = () => {
    const currentTime = new Date();
    const fortyHours = 1000 * 60 * 60 * 40;

    const futureTime = new Date(currentTime.getTime() + fortyHours);

    console.log('Date result: ', futureTime);

    const futureDay = futureTime.getDay();
    const isFutureTimeWeekend = futureDay === 6 || futureDay === 0;

    if (isFutureTimeWeekend) {
        console.log('Future time is weekend! Yay!');
    } else {
        console.log('No weekend in 40 hours :(');
    }
};


const main = async () => {
    arrayTask();
    breakLine();
    await apiTask();
    breakLine();
    dateTask();
}

main();

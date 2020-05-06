import React, {useEffect, useState} from 'react';
import {Helmet} from 'react-helmet';
import Md from 'react-markdown';
import {getEvents} from '../helpers/client';

import Footer from './Footer';

export default function({
  translate,
  lang
}) {

  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
   getEvents()
   .then(({data}) => {
     setEvents(data);
   }) 
   .catch((e) => {
     console.error(e);
     setError(e);
   })
  }, [])

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  });
  const now = new Date().getTime();
  const pastEvents = events.filter(event => event.end < now);
  const currentEvents = events.filter(event => event.end >= now);
  const renderEventsList = evs => (
    <table className="events-list-container">
      <thead>
        <tr>
          <th>{translate('when')}</th>
          <th>{translate('event')}</th>
          <th>{translate('moderators')}</th>
        </tr>
      </thead>
      <tbody>
        {
          evs.map((event, index) => (
            <tr key={index}>
              <td className="dates-container">
                {new Date(event.start).toDateString()} — {new Date(event.end).toDateString()}
              </td>
              <td className="event-container">
                <h2>{event.title}</h2>
                <Md source={event.description} />
              </td>
              <td className="moderators-container">
                {
                  event.moderators.map((moderator, index) => <span key={index}>{moderator}</span>)
                }
              </td>
            </tr>
          ))
        }
      </tbody>
    </table>
  )
  return (
    <div className="events-container">
      <Helmet>
        <title>{translate('website-title')} | {translate('events')}</title>
      </Helmet>
      <div className="events-content">
        {
          events.length ?
          <>
            <div className="current-events events-section">
              <h1>{translate('events')}</h1>
              {renderEventsList(currentEvents)}
            </div>
            <div className="past-events events-section">
              <h1>{translate('past-events')}</h1>
              {renderEventsList(pastEvents)}
            </div>
          </>
        : error ?
            <div className="events-info">
              {translate('events-could-not-be-retrieved')}
            </div>
            :
            <div className="events-info">
              {translate('loading-events')}
            </div>
        }      
      </div>
      <Footer {...{translate}} />
    </div>
  )
}
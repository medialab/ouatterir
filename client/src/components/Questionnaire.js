import React, {useState, useEffect} from 'react';
import {Helmet} from 'react-helmet';
import Md from 'react-markdown';
import Textarea from 'react-textarea-autosize';
import {v4 as genId} from 'uuid';
import {getOrInitObject, createProposition, cleanData} from '../helpers/misc';
import {postAnswer} from '../helpers/client';

import introFr from '!!raw-loader!../locales/texts/intro/fr.md';/* eslint import/no-webpack-loader-syntax : 0 */
import introEn from '!!raw-loader!../locales/texts/intro/en.md';/* eslint import/no-webpack-loader-syntax : 0 */

const defaultData = {
  id: genId(),
  email: undefined,
  propositions: []
}

// min text length for answers
// @todo put in config ?
const TEXT_LIMIT = 150;

export default function({
  translate,
  lang,
  eventListener
}) {
  // registering questionnaire questions
  const questions =  {
    'develop': [
      translate('to-develop-question-1'),
      translate('to-develop-question-2'),
      translate('to-develop-question-3'),
      translate('to-develop-question-4'),
      translate('to-develop-question-5'),
    ],
    'stop': [
      translate('to-stop-question-1'),
      translate('to-stop-question-2'),
      translate('to-stop-question-3'),
      translate('to-stop-question-4'),
    ]
  }
  /**
   * ==============
   * Initial values
   * ==============
   */
  const initialData = getOrInitObject('mayday/questionnaireData', defaultData);
  // questionnaire responses data
  const [data, setData] = useState(initialData);
  const initialStage = +getOrInitObject('mayday/questionnaireStage', 0);
  // index of the proposition being edited
  let initialIndex = +getOrInitObject('questionnaireIndex', 0);
  // prevent exceptions or issues with data
  if (!data || initialIndex > data.propositions.length  - 1) {
    initialIndex = 0;
  }
  /**
   * ==============
   * State definitions
   * ==============
   */
  // questionnaire stage
  // stage = state machine for the questionnaire views
  // "stage" values :
  // 0 = spash screen
  // 1-(n-1) = number of the active question
  // null = final screen (send your proposals);
  const [stage, setStage] = useState(initialStage);
  // index of the proposition being edited
  const [questionnaireIndex, setQuestionnaireIndex] = useState(initialIndex);
  // "review your answers" open/close state
  const [reviewVisible, setReviewVisible] = useState(false);
  // xhr status
  const [sendStatus, setSendStatus] = useState(undefined);

  const [shareVisible, setShareVisible] = useState(false);
  /**
   * ==============
   * Localstorage savings
   * ==============
   */
  // save data in localstorage at each change
  // @todo could be debounced
  useEffect(() => {
    localStorage.setItem('mayday/questionnaireData', JSON.stringify(data));
  });
  
  // save stage to local storage
  useEffect(() => {
    localStorage.setItem('mayday/questionnaireStage', stage);
    if(stage === 0) {
      setData(cleanData(data))
      setReviewVisible(false);
    }
    setReviewVisible(false);
    // focusing on active textarea or input at each stage change
    setTimeout(() => {
      const el  = document.querySelector('textarea.active, input')
      if (el) {
        el.focus();
      }
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      })
    })
  }, [stage]);
  
  // save currently edited proposition index
  useEffect(() => {
    localStorage.setItem('mayday/questionnaireIndex', questionnaireIndex);
  }, [questionnaireIndex]);

  useEffect(() => {
    if (shareVisible) {
      let el = document.querySelector('.share-container');
      if(el) {
        setTimeout(() => {
          const top = el.offsetTop;
          window.scrollTo({
            top,
            behavior: 'smooth'
          });
        }, 700)
      }
    }
  }, [shareVisible]);


  useEffect(() => {
    if (reviewVisible) {
      let el = document.querySelector('.propositions-container');
      if(el) {
        setTimeout(() => {
          const top = el.offsetTop;
          window.scrollTo({
            top,
            behavior: 'smooth'
          });
        }, 700)

      }
    }
  }, [reviewVisible]);

  // trick to enable reseting stage if questionnaire is clicked in nav
  const handleEvent = function(type, payload) {
    if (type === 'questionnaireClick') {
      setStage(0);
    }
  }
  useEffect(() => {
    eventListener.addSubscriber(handleEvent)
  }, [eventListener])

  /**
   * ==========================
   * Temp variables
   * ==========================
   */
  // capture current proposition data
  const currentProposition = stage > 0 && questionnaireIndex < data.propositions.length && data.propositions[questionnaireIndex];
  const currentPropositionType = currentProposition && currentProposition.type === 'develop' ? 'develop': 'stop';
  
  const questionsLabels = questions[currentPropositionType];
  const numberOfQuestions = questionsLabels.length;

  let currentText;
  if (stage > 0 && stage !== -1) {
    currentText = data.propositions[questionnaireIndex] ? data.propositions[questionnaireIndex][`question${stage}`] : '';
  }
  const emailIsValid = data.email && /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(data.email);

  /**
   * =========
   * Callbacks
   * =========
   */
  // add a new activity
  const handleAddActivity = type => {
    const proposition = createProposition(type, questions)
    const newData = {
      ...data,
      propositions: [
        ...data.propositions,
        proposition
      ]
    }
    setQuestionnaireIndex(data.propositions.length)
    setData(newData);
    setStage(1);
  }
  const handleStopActivity = () => handleAddActivity('stop', questions);
  const handleDevelopActivity = () => handleAddActivity('develop', questions);

  // go to next question
  const handleNextStage = () => {
    let nextStage = stage + 1;
    if (nextStage > numberOfQuestions) {
      nextStage = -1;
    }
    setStage(nextStage);
  }
  // go to previous question
  const handlePreviousStage = () => {
    const previousStage = stage - 1;
    setStage(previousStage);
  }
  // save current question text
  const handleSaveActiveText = (thatText) => {
    const newData = {
      ...data,
      propositions: data.propositions.map((prop, index) => {
        if (index === questionnaireIndex) {
          return {
            ...prop,
            [`question${stage}`]: thatText
          }
        }
        return prop;
      })
    }
    setData(newData)
  }
  // register active textarea change
  const handleActiveTextChange = (e) => {
    handleSaveActiveText(e.target.value);
  }
  // register email input change
  const handleEmailChange = (thatEvent) => {
    setData({
      ...data,
      email: thatEvent.target.value,
    })
  }
  // register given name input change
  const handleGivenNameChange = (thatEvent) => {
    setData({
      ...data,
      givenName: thatEvent.target.value,
    })
  }
  // register family name input change
  const handleFamilyNameChange = (thatEvent) => {
    setData({
      ...data,
      familyName: thatEvent.target.value,
    })
  }
  const handleWorkshopContactChange = (thatEvent) => {
    setData({
      ...data,
      workshopContact: data.workshopContact !== undefined ? !data.workshopContact : true,
    })
  }
  // register family name input change
  const handleAreaOfExpertiseChange = (thatEvent) => {
    setData({
      ...data,
      areaOfExpertise: thatEvent.target.value,
    })
  }
  // send questionnaire to API
  const handleSubmit = (e) => {
    if (e) {
      e.preventDefault();
    }
    const finalData = {
      ...data, 
      lang
    }
    setSendStatus('sending');
    // this is a mock for the actual request
    postAnswer(finalData)
    .then(() => {
      setSendStatus('success');
      setTimeout(() => {
        setSendStatus(undefined)
      }, 4000)
    })
    .catch(e => {
      console.error(e);
      setSendStatus('error');
      setTimeout(() => {
        setSendStatus(undefined)
      }, 4000)
    })
  }


  // set "review my propositions" visibility
  const handleToggleReviewVisible = () => {
    setReviewVisible(!reviewVisible);
  }
  const toggleShareVisible = () => {
    setShareVisible(!shareVisible);
  }

  const renderSubmitForm = (allowProofread = true) => (
    <div className="important-section">
      <h3>{translate('submit-form-explanation')}</h3>

      <p>{translate('submit-form-anonymously-explanation')}</p>
      <p>{translate('submit-form-with-contact-explanation')}</p>
      
      <div>
        <input type="input" onChange={handleGivenNameChange} value={data.givenName || ''} placeholder={translate('given-name-prompt')} />
      </div>
      <div>
        <input type="input" onChange={handleFamilyNameChange} value={data.familyName || ''} placeholder={translate('family-name-prompt')} />
      </div>
      <div>
        <input type="input" onChange={handleAreaOfExpertiseChange} value={data.areaOfExpertise || ''} placeholder={translate('area-of-expertise-prompt')} />
      </div>
      <div>
        <input type="email" onChange={handleEmailChange} value={data.email || ''} placeholder={translate('email-prompt')} />
      </div>
      <div onClick={handleWorkshopContactChange} className={`radio-container ${emailIsValid ? '' : 'disabled'}`}>
        <input onChange={handleWorkshopContactChange} checked={data.workshopContact || false} type="radio"/>
        <label>
          {translate('workshop-contact-prompt')}
        </label>
      </div>
      <ul className="buttons-row">
        {
          allowProofread &&
          <li onClick={handleToggleReviewVisible}>
            <button className={`${reviewVisible ? 'active': ''}`}>
              {translate('review-your-propositions')}
            </button>
          </li>}
        
        <li>
            <button disabled={false/*!data.email || !emailIsValid*/} className="important-button" onClick={handleSubmit} type="submit">
              {translate('submit-form')}
            </button>
        </li>
      </ul>
    </div>
  )
  const renderProofRead = () => (
    <div className="propositions-container">
      {/* <h2 className="propositions-title">
        <span>{translate('summary-title')} ({data.propositions.length})
        </span>
      </h2> */}
      {
        data.propositions
        .reverse()
        .map((proposition, propositionIndex) => {
          const {type} = proposition;
          const labels = type === 'develop' ? [
            translate('to-develop-question-1'),
            translate('to-develop-question-2'),
            translate('to-develop-question-3'),
            translate('to-develop-question-4'),
            translate('to-develop-question-5'),
          ] : 
          [
            translate('to-stop-question-1'),
            translate('to-stop-question-2'),
            translate('to-stop-question-3'),
            translate('to-stop-question-4'),
          ];

          // const handleEditProposition = () => {
          //   setQuestionnaireIndex(propositionIndex);
          //   setStage(1)
          // }

          const handleDeleteProposition = () => {
            const newData = {
              ...data,
              propositions: data.propositions.filter((p, i) => i !== propositionIndex)
            }
            setData(newData)
            if (newData.propositions.length === 0) {
              setReviewVisible(false);
            }
          }
          
          return (
            <div key={propositionIndex} className="proposition">
              <h3>
                <span className="proposition-title">
                  {translate('Proposition')} {data.propositions.length - propositionIndex} ({translate(proposition.type === 'stop' ? 'add-activity-to-stop': 'add-activity-to-develop' )})
                </span>
                <span className="small-buttons-container">
                  
                  <button onClick={handleDeleteProposition}>
                    {translate('delete')}
                  </button>
                </span>
              </h3>
              
              {
                labels.map((question, questionIndex) => {
                  const handleEdit = () => {
                    setQuestionnaireIndex(propositionIndex);
                    setStage(questionIndex + 1)
                  }
                  return (
                    <div onClick={handleEdit} className="question" key={questionIndex}>
                      <h4>{question}</h4>
                      <blockquote>
                        {proposition[`question${questionIndex + 1}`]}
                      </blockquote>
                    </div>
                  )
                })
              }
            </div>
          )
        })
      }
    </div>
  )
  return (
    <div>
      <Helmet>
        <title>{translate('website-title')} | {translate('questionnaire')}</title>
      </Helmet>
      <div>
        {
          stage === 0 ?
          <div>
            {<Md source={lang === 'fr' ? introFr : introEn} />}
            <ul className={`big-select`}>
              <li><button className="stop" onClick={handleStopActivity}>{translate('add-activity-to-stop')}</button></li>
              <li><button className="develop" onClick={handleDevelopActivity}>{translate('add-activity-to-develop')}</button></li>
            </ul>

            <ul className="buttons-row">
              {
                data.propositions.length ?
              <li><button className={reviewVisible ? 'active' : ''} onClick={handleToggleReviewVisible}>{translate('review-your-propositions')} {!reviewVisible && `(${data.propositions.length})`}</button></li>
                : null
              }
              {data.propositions.length ?
               <li><button className="important-button" onClick={toggleShareVisible} >{translate('go-to-submit')}</button></li>
              : null}
            </ul>
            { reviewVisible &&
              renderProofRead()
            }
            <div className={`share-container ${shareVisible ? 'visible' : 'hidden'}`}>
              {renderSubmitForm(false)}
            </div>
            
          </div>
          : null
        }
        {
          stage > 0 ?
          <ul className="question-container">
              {
                questionsLabels.map((label, index) => {
                  if (index === stage - 1) {
                    return (
                    <li key={label} className="active">
                    <h2>{label}</h2>
                      
                      <Textarea className="active" value={currentText} onChange={handleActiveTextChange} placeholder={translate('write-here')} />
                      {currentText.length < TEXT_LIMIT &&
                      <div className="text-length-indicator">
                          <i>{translate('char-limit-indicator')}</i>
                      </div>
                      }
                      <ul className="buttons-row reverse">
                      
                      {
                        stage < numberOfQuestions ?
                        <li><button disabled={currentText.length < TEXT_LIMIT} className={`important-button ${currentPropositionType}`} onClick={handleNextStage}>{translate('next-question')}</button></li>
                        : <li><button className={`important-button ${currentPropositionType}`} disabled={currentText.length < TEXT_LIMIT} onClick={handleNextStage}>{translate('validate-proposition')}</button></li>
                      }
                      {
                        stage > 1 ?
                        <li><button className={currentPropositionType} onClick={handlePreviousStage}>{translate('previous-question')}</button></li>
                        : null
                      }
                      </ul>
                      
                    </li>);
                  }
                  const thatText = currentProposition[`question${index + 1}`];
                  if (thatText.trim().length) {
                    const handleClick = () => {
                      setStage(index + 1)
                    }
                    return (
                      <li onClick={handleClick} key={label}>
                        <h2>{label}</h2>
                        <Textarea value={thatText} />
                      </li>
                    )
                  }
                  return null;
                })
              }
            
          </ul>
          : null
        }
        {
          stage === -1 ?
          <div>
            
                <h2>{translate('thank-you')}</h2>
                <ul className={`big-select`}>
                  <li><button className="stop" onClick={handleStopActivity}>{translate('add-activity-to-stop-bis')}</button></li>
                  <li><button className="develop" onClick={handleDevelopActivity}>{translate('add-activity-to-develop-bis')}</button></li>
                </ul>
                <ul className="buttons-row">
                  
                  <li>
                      <button className="important-button" onClick={toggleShareVisible} type="submit">
                        {translate('go-to-submit')}
                      </button>
                  </li>
                </ul>
                <div className={`share-container ${shareVisible ? 'visible' : 'hidden'}`}>
                  {renderSubmitForm()}
                </div>
                {reviewVisible && renderProofRead()}
             
          </div> : null
        }
        {
          stage === null ?
          <form className={`question-container normalized`} onSubmit={handleSubmit}>
            {
              reviewVisible ? null :
              <div>
                {renderSubmitForm()}
              </div>
            }
          </form>
          : null
        }
        {
          sendStatus ?
          <div className="status-container">
            <div className="status-content">
              <i>{translate(sendStatus)}</i>
            </div>
          </div>
          : null
        }
      </div>
    </div>
  )
}
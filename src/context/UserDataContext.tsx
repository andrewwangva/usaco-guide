import * as React from 'react';
import { createContext, useState } from 'react';
import ReactDOM from 'react-dom';
import { Problem } from '../../content/models';
import { ModuleProgress } from '../models/module';
import { ProblemProgress } from '../models/problem';
import useFirebase from '../hooks/useFirebase';

// this file needs some serious cleanup
// be SUPER careful when modifying this file
// as a matter of fact, I'd strongly recommend rewriting this file before modifying it

// Imagine this: You're in a speedforces contest solving a trivial div2a problem
// The maintainability of the code you write for that problem should be roughly equal
// to the maintainability of this file.

export type UserLang = 'showAll' | 'cpp' | 'java' | 'py';
export const LANGUAGE_LABELS: { [key in UserLang]: string } = {
  showAll: 'All',
  cpp: 'C++',
  java: 'Java',
  py: 'Python',
};

const UserDataContext = createContext<{
  lang: UserLang;
  setLang: (lang: UserLang) => void;

  userProgressOnModules: { [key: string]: ModuleProgress };
  setModuleProgress: (moduleID: string, progress: ModuleProgress) => void;

  userProgressOnProblems: { [key: string]: ProblemProgress };
  setUserProgressOnProblems: (
    problem: Problem,
    status: ProblemProgress
  ) => void;

  lastViewedModule: string;
  setLastViewedModule: (moduleID: string) => void;

  lastReadAnnouncement: string;
  setLastReadAnnouncement: (announcementID: string) => void;

  test: string;
  setTest: (x: string) => void;

  firebaseUser: any;
  signIn: Function;
  signOut: Function;
}>(null);

const langKey = 'guide:userData:lang';
const getLangFromStorage = () => {
  let stickyValue = window.localStorage.getItem(langKey);
  let v = null;
  try {
    v = JSON.parse(stickyValue);
  } catch (e) {
    console.error("Couldn't parse user primary language", e);
  }
  if (v === 'cpp' || v === 'java' || v === 'py') return v;
  return 'cpp';
};

const progressKey = 'guide:userData:progress';
const getProgressFromStorage = () => {
  let stickyValue = window.localStorage.getItem(progressKey);
  let v = {};
  try {
    v = JSON.parse(stickyValue);
  } catch (e) {
    console.error("Couldn't parse user progress", e);
  }
  return v || {};
};

const problemStatusKey = 'guide:userData:problemStatus';
const getProblemStatusFromStorage = () => {
  let stickyValue = window.localStorage.getItem(problemStatusKey);
  let v = {};
  try {
    v = JSON.parse(stickyValue);
  } catch (e) {
    console.error("Couldn't parse problem status", e);
  }
  return v || {};
};

const lastViewedModuleKey = 'guide:userData:lastViewedModule';
const getLastViewedModuleFromStorage = () => {
  let stickyValue = window.localStorage.getItem(lastViewedModuleKey);
  let v = null;
  try {
    v = JSON.parse(stickyValue);
  } catch (e) {
    console.error("Couldn't parse last viewed module", e);
  }
  return v || null;
};

const lastReadAnnouncementKey = 'guide:userData:lastReadAnnouncement';
const getLastReadAnnouncementFromStorage = () => {
  let stickyValue = window.localStorage.getItem(lastReadAnnouncementKey);
  let v = null;
  try {
    v = JSON.parse(stickyValue);
  } catch (e) {
    console.error("Couldn't parse last read announcement", e);
  }
  return v || null;
};

function areEqualShallow(a, b) {
  for (let key of Object.keys(a)) {
    if (a[key] !== b[key]) {
      return false;
    }
  }
  return true;
}

export const UserDataProvider = ({ children }) => {
  const [lang, setLang] = useState<UserLang>('showAll');
  const [userProgressOnModules, setUserProgressOnModules] = useState<{
    [key: string]: ModuleProgress;
  }>({});
  const [userProgressOnProblems, setUserProgressOnProblems] = useState<{
    [key: string]: ProblemProgress;
  }>({});
  const [lastViewedModule, setLastViewedModule] = useState<string>(null);
  const [test, setTest] = useState<string>('START');
  const [lastReadAnnouncement, setLastReadAnnouncement] = useState<string>(
    null
  );
  const [firebaseUser, setFirebaseUser] = useState(null);

  useFirebase(firebase => {
    return firebase.auth().onAuthStateChanged(user => {
      setFirebaseUser(user);
    });
  });

  const firebase = useFirebase();

  React.useEffect(() => {
    setLang(getLangFromStorage());
    setUserProgressOnModules(getProgressFromStorage());
    setUserProgressOnProblems(getProblemStatusFromStorage());
    setLastViewedModule(getLastViewedModuleFromStorage());
    setLastReadAnnouncement(getLastReadAnnouncementFromStorage());
  }, []);

  React.useEffect(() => {
    if (firebaseUser) {
      return firebase
        .firestore()
        .collection('users')
        .doc(firebaseUser.uid)
        .onSnapshot(snapshot => {
          let data = snapshot.data();
          let updateData = true;
          if (!data) {
            if (lastViewedModule !== null) {
              if (confirm('Upload local progress to server?')) {
                // sync all local data with firebase if the firebase account doesn't exist yet
                firebase
                  .firestore()
                  .collection('users')
                  .doc(firebaseUser.uid)
                  .set(
                    {
                      lang,
                      userProgressOnModules,
                      userProgressOnProblems,
                      lastViewedModule,
                      lastReadAnnouncement,
                      test,
                    },
                    { merge: true }
                  );
                updateData = true;
              }
            }
          }
          if (updateData) {
            data = data || {};
            ReactDOM.unstable_batchedUpdates(() => {
              setLang(data.lang || 'cpp');
              setLastViewedModule(data.lastViewedModule || null);
              setUserProgressOnModules(data.userProgressOnModules || {});
              setUserProgressOnProblems(data.userProgressOnProblems || {});
              setLastReadAnnouncement(data.lastReadAnnouncement || null);
              setTest(data.test);
            });
          }
        });
    }
  }, [firebaseUser]);

  const userData = React.useMemo(
    () => ({
      lang: lang as UserLang,
      setLang: lang => {
        if (firebaseUser) {
          firebase
            .firestore()
            .collection('users')
            .doc(firebaseUser.uid)
            .set({ lang }, { merge: true });
        }
        window.localStorage.setItem(langKey, JSON.stringify(lang));
        setLang(lang);
      },
      userProgressOnModules,
      setModuleProgress: (moduleID: string, progress: ModuleProgress) => {
        if (firebaseUser) {
          firebase
            .firestore()
            .collection('users')
            .doc(firebaseUser.uid)
            .set(
              {
                userProgressOnModules: {
                  [moduleID]: progress,
                },
              },
              { merge: true }
            );
        } else {
          const newProgress = {
            ...getProgressFromStorage(),
            [moduleID]: progress,
          };
          window.localStorage.setItem(progressKey, JSON.stringify(newProgress));
          setUserProgressOnModules(newProgress);
        }
      },
      userProgressOnProblems,
      setUserProgressOnProblems: (problem, status) => {
        if (firebaseUser) {
          firebase
            .firestore()
            .collection('users')
            .doc(firebaseUser.uid)
            .set(
              {
                userProgressOnProblems: {
                  [problem.uniqueID]: status,
                },
              },
              { merge: true }
            );
        } else {
          const newStatus = {
            ...getProblemStatusFromStorage(),
            [problem.uniqueID]: status,
          };
          window.localStorage.setItem(
            problemStatusKey,
            JSON.stringify(newStatus)
          );

          setUserProgressOnProblems(newStatus);
        }
      },
      lastViewedModule,
      setLastViewedModule: moduleID => {
        if (firebaseUser) {
          firebase.firestore().collection('users').doc(firebaseUser.uid).set(
            {
              lastViewedModule: moduleID,
            },
            { merge: true }
          );
        } else {
          window.localStorage.setItem(
            lastViewedModuleKey,
            JSON.stringify(moduleID)
          );
          setLastViewedModule(moduleID);
        }
      },
      lastReadAnnouncement,
      setLastReadAnnouncement: announcementID => {
        if (firebaseUser) {
          firebase.firestore().collection('users').doc(firebaseUser.uid).set(
            {
              lastReadAnnouncement: announcementID,
            },
            { merge: true }
          );
        }
        window.localStorage.setItem(
          lastReadAnnouncementKey,
          JSON.stringify(announcementID)
        );
        setLastReadAnnouncement(announcementID);
      },
      test,
      setTest: x => {
        console.log('SETTING TEST');
        if (firebaseUser) {
          console.log('OK, SETTING TEST EQUAL TO', x);
          firebase.firestore().collection('users').doc(firebaseUser.uid).set(
            {
              test: x,
            },
            { merge: true }
          );
        } else {
          console.log('FIREBASE USER NOT FOUND');
        }
      },
      firebaseUser,
      signIn: () => {
        if (
          confirm(
            'Warning: User accounts is still in beta. There is a risk of complete data loss. Are you sure you want to proceed?'
          )
        ) {
          firebase
            .auth()
            .signInWithPopup(new firebase.auth.GoogleAuthProvider());
        }
      },
      signOut: () => {
        firebase
          .auth()
          .signOut()
          .then(() => window.location.reload());
      },
    }),
    [
      lang,
      userProgressOnModules,
      userProgressOnProblems,
      lastViewedModule,
      lastReadAnnouncement,
      firebaseUser,
      firebase,
      test,
    ]
  );

  return (
    <UserDataContext.Provider value={userData}>
      {children}
    </UserDataContext.Provider>
  );
};

export default UserDataContext;

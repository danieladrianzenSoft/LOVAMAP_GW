import { BrowserHistory } from "history";
import { useLayoutEffect, useState } from "react";
import { Router } from "react-router-dom";

const HistoryRouter = ({ history, children, ...props } : {history: BrowserHistory, children: any}) => {
  const [state, setState] = useState({
    action: history.action,
    location: history.location
  });

  useLayoutEffect(() => history.listen(setState), [history]);

  return (
    <Router
      {...props}
      children={children}
      location={state.location}
      navigationType={state.action}
      navigator={history}
    />
  );
};

export default HistoryRouter;
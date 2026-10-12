import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Memorijali = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/digitalni-memorijal', { replace: true });
  }, [navigate]);
  return null;
};

export default Memorijali;

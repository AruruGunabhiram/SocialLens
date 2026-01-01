package com.LogicGraph.sociallens.service;

import com.LogicGraph.sociallens.dto.user.CreateUserRequest;
import com.LogicGraph.sociallens.dto.user.UserResponse;
import com.LogicGraph.sociallens.entity.User;
import com.LogicGraph.sociallens.repository.UserRepository;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public UserResponse createUser(CreateUserRequest request) {
        User user = new User(request.getEmail(), request.getName());
        User saved = userRepository.save(user);

        return new UserResponse(saved.getId(), saved.getEmail(), saved.getName());
    }
}

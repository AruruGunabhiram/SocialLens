package com.LogicGraph.sociallens.service;

import com.LogicGraph.sociallens.dto.user.CreateUserRequest;
import com.LogicGraph.sociallens.dto.user.UserResponse;
import com.LogicGraph.sociallens.entity.User;
import com.LogicGraph.sociallens.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    /** Sentinel email used for the auto-bootstrapped local-dev user. */
    static final String LOCAL_DEV_EMAIL = "local-dev@sociallens.local";

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public UserResponse createUser(CreateUserRequest request) {
        User user = new User(request.getEmail(), request.getName());
        User saved = userRepository.save(user);
        return new UserResponse(saved.getId(), saved.getEmail(), saved.getName());
    }

    /**
     * Returns the single local-dev user, creating one if the users table is empty.
     *
     * <p>There is no auth layer yet, so all requests share one implicit "current
     * user". Replace this with a principal-based lookup once real auth is added.
     */
    @Transactional
    public UserResponse getOrCreateDefaultLocalUser() {
        User user = userRepository.findByEmail(LOCAL_DEV_EMAIL)
                .or(userRepository::findFirstByOrderByIdAsc)
                .orElseGet(() -> userRepository.save(new User(LOCAL_DEV_EMAIL, "Local Dev User")));
        return new UserResponse(user.getId(), user.getEmail(), user.getName());
    }
}
